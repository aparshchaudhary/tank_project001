from datetime import datetime, timezone
import pytest
from app.core.database import SessionLocal, Base, engine
from app.seed_data import seed_database
from app.models.all_models import Subsystem, BaselineSignature, User, Alert, MaintenanceEvent
from app.services.baseline_engine import baseline_engine
from app.services.anomaly_detector import anomaly_detector
from app.services.health_index_engine import health_index_engine
from app.services.alert_service import alert_service
from app.services.maintenance_service import maintenance_service
from app.services.report_generator import report_generator

def test_complete_end_to_end_demo_flow():
    # Setup test DB and seed baseline data
    seed_database()
    db = SessionLocal()
    try:
        # Step 1: Start healthy simulation & inspect healthy baseline
        sub = db.query(Subsystem).filter(Subsystem.code == "RECOIL").first()
        assert sub is not None
        sub.current_health_index = 88.2
        db.commit()
        assert sub.current_health_index >= 75.0

        # Step 2 & 3: Establish healthy baselines
        baselines = baseline_engine.get_active_baselines(db, sub.id)
        assert len(baselines) > 0
        r_base = baselines.get("recoil_distance")
        assert r_base is not None

        # Step 4: Introduce controlled simulated fault (Excessive recoil stroke > 350 mm)
        fault_recoil_val = 362.0  # > 350 mm CRITICAL
        all_features = {
            "recoil_distance": fault_recoil_val,
            "recoil_speed": 2.1,
            "recoil_time": 0.38,
            "oil_level": 85.0
        }

        # Step 5: Detect Anomaly
        anomaly = anomaly_detector.evaluate_feature(
            subsystem_id=sub.id,
            subsystem_code=sub.code,
            feature_name="recoil_distance",
            current_value=fault_recoil_val,
            baseline=r_base,
            all_features=all_features
        )
        assert anomaly is not None
        assert anomaly.severity in ["WARNING", "CRITICAL"]
        db.add(anomaly)
        db.commit()

        # Step 6: Calculate lower Health Index
        hi, status_band, _, _ = health_index_engine.calculate_health_index(
            subsystem=sub,
            current_features=all_features,
            baselines=baselines
        )
        assert hi < 80.0
        assert status_band in ["DEGRADING", "SIGNIFICANT DEGRADATION", "SEVERE CONDITION", "NORMAL / EARLY DEVIATION"]

        # Step 7 & 8: Generate Warning / Critical Alert
        db.query(Alert).filter(Alert.subsystem_id == sub.id, Alert.feature_name == "recoil_distance").delete()
        db.commit()
        alert = alert_service.trigger_or_update_alert(
            db=db,
            subsystem_id=sub.id,
            feature_name="recoil_distance",
            severity=anomaly.severity,
            current_value=fault_recoil_val,
            baseline_value=r_base.baseline_mean,
            health_index_snapshot=hi,
            probable_issue=anomaly.fault_diagnosis
        )
        assert alert.status == "ACTIVE"

        # Step 9: Acknowledge alert by technician
        tech_user = db.query(User).filter(User.username == "tech").first()
        assert tech_user is not None
        acked = alert_service.acknowledge_alert(
            db=db,
            alert_id=alert.id,
            user=tech_user,
            notes="Acknowledged in test bench. Recoil buffer inspection scheduled."
        )
        assert acked.status == "ACKNOWLEDGED"

        # Step 10 & 11: Create maintenance event & verify updated history
        maint = maintenance_service.create_maintenance_event(
            db=db,
            subsystem_id=sub.id,
            user=tech_user,
            event_type="INSPECTION",
            description="Verified recoil buffer stroke length and nitrogen replenishment.",
            anomaly_id=anomaly.id,
            maintenance_priority="HIGH"
        )
        assert maint.id is not None
        assert maint.maintenance_priority == "HIGH"

        # Step 12: Generate report
        report_data = report_generator.gather_report_data(db, "daily_health", days=1)
        assert report_data["overall_health_index"] > 0
        html_report = report_generator.generate_html_report(report_data)
        assert "TURRET CBPM" in html_report
        pdf_report = report_generator.generate_pdf_report(report_data)
        assert len(pdf_report) > 100

    finally:
        db.close()
