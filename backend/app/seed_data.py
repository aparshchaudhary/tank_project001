from datetime import datetime, timezone, timedelta
import random
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, Base, engine
from app.core.security import get_password_hash
from app.models.all_models import (
    User, Subsystem, SensorChannel, BaselineSignature,
    HealthIndexRecord, AnomalyEvent, Alert, MaintenanceEvent, ModelVersion, AuditLogEntry
)
from app.simulator.scenarios import NOMINAL_BASELINES

def seed_database():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    try:
        # 1. Seed Users if not present
        if db.query(User).count() == 0:
            users = [
                User(
                    username="admin",
                    email="admin@turret-cbpm.lab",
                    hashed_password=get_password_hash("admin123"),
                    full_name="Chief Systems Engineer",
                    role="ADMIN"
                ),
                User(
                    username="tech",
                    email="tech@turret-cbpm.lab",
                    hashed_password=get_password_hash("tech123"),
                    full_name="Lead Maintenance Technician",
                    role="TECHNICIAN"
                ),
                User(
                    username="viewer",
                    email="viewer@turret-cbpm.lab",
                    hashed_password=get_password_hash("viewer123"),
                    full_name="Test Bench Operator",
                    role="VIEWER"
                )
            ]
            db.add_all(users)
            db.commit()

        # 2. Seed Model Versions
        if db.query(ModelVersion).count() == 0:
            models = [
                ModelVersion(
                    model_name="Anomaly Detector",
                    version="1.0",
                    model_type="Statistical Baseline",
                    status="ACTIVE",
                    metrics={"f1_score": 0.94, "precision": 0.96, "false_positive_rate": 0.03},
                    hyperparameters={"k_sigma": 3.0, "window_seconds": 10.0}
                ),
                ModelVersion(
                    model_name="Health Index Engine",
                    version="1.0",
                    model_type="Weighted Deviation Metric",
                    status="ACTIVE",
                    metrics={"reproducibility": 1.0, "latency_ms": 1.2},
                    hyperparameters={"formula": "100 * (1 - weighted_avg(deviation))"}
                ),
                ModelVersion(
                    model_name="Prognostics / RUL Estimator",
                    version="1.0",
                    model_type="Linear & Exponential Degradation Regression",
                    status="ACTIVE",
                    metrics={"mean_absolute_error_hrs": 4.5, "r2_score": 0.89},
                    hyperparameters={"min_samples": 20, "critical_threshold": 25.0}
                )
            ]
            db.add_all(models)
            db.commit()

        # 3. Seed Subsystems and Sensors (auto-migrate if old subsystem codes exist)
        needs_seed = db.query(Subsystem).count() == 0 or db.query(Subsystem).filter(Subsystem.code == "TURRET_DRIVE").first() is not None
        if needs_seed:
            # Clear old records if migrating from previous schema
            if db.query(Subsystem).filter(Subsystem.code == "TURRET_DRIVE").first() is not None:
                db.query(Alert).delete()
                db.query(MaintenanceEvent).delete()
                db.query(AnomalyEvent).delete()
                db.query(HealthIndexRecord).delete()
                db.query(BaselineSignature).delete()
                db.query(SensorChannel).delete()
                db.query(Subsystem).delete()
                db.commit()

            subsystems_meta = [
                {
                    "code": "LRF",
                    "name": "Laser Range Finder (LRF)",
                    "category": "Electro-Optical",
                    "description": "Precision laser range determination, detector voltage monitoring (10.5-12.5V), and optical path health.",
                    "hours": 280.0,
                    "cycles": 9500,
                    "initial_hi": 96.5
                },
                {
                    "code": "ALG",
                    "name": "Automatic Loader & Gun System (ALG)",
                    "category": "Mechanical / Electrical",
                    "description": "Autoloader sequencing, circuit serviceability checks, and 6-microswitch operational verification.",
                    "hours": 310.0,
                    "cycles": 11200,
                    "initial_hi": 94.0
                },
                {
                    "code": "RECOIL",
                    "name": "Recoil Mechanism Subsystem",
                    "category": "Hydraulic / Mechanical",
                    "description": "Dynamic recoil buffer cylinder, stroke distance (mm), buffer speed, cycle duration, and oil reservoir level.",
                    "hours": 195.0,
                    "cycles": 5800,
                    "initial_hi": 88.5
                },
                {
                    "code": "ELEVATION",
                    "name": "Elevation Drive Subsystem",
                    "category": "Electro-Hydraulic",
                    "description": "Gun elevation drive, K1 relay voltage (25-40V), power supply mount voltage (25-40V), and cylinder pressure (10-200 MPa).",
                    "hours": 340.0,
                    "cycles": 12400,
                    "initial_hi": 91.5
                },
                {
                    "code": "AZIMUTH",
                    "name": "Azimuth / Turret Drive Subsystem",
                    "category": "Electrical / Mechanical",
                    "description": "Turret rotational slew assembly, K1 contactor voltage (25-40V), MP9 voltage (25-40V), and motor voltage (25-40V).",
                    "hours": 340.0,
                    "cycles": 12400,
                    "initial_hi": 93.0
                },
                {
                    "code": "TRAVERSE",
                    "name": "Traverse Drive Subsystem",
                    "category": "Electrical",
                    "description": "Traverse tracking drive servo motor and electrical bus voltage regulation (25-40V).",
                    "hours": 260.0,
                    "cycles": 8900,
                    "initial_hi": 95.0
                }
            ]

            now = datetime.now(timezone.utc)

            for meta in subsystems_meta:
                code = meta["code"]
                feature_dict = NOMINAL_BASELINES.get(code, {})
                
                # Equal weights initially
                weights = {feat: 1.0 for feat in feature_dict.keys()}

                sub = Subsystem(
                    code=code,
                    name=meta["name"],
                    category=meta["category"],
                    description=meta["description"],
                    operating_hours=meta["hours"],
                    operating_cycles=meta["cycles"],
                    current_health_index=meta["initial_hi"],
                    feature_weights=weights
                )
                db.add(sub)
                db.flush()

                # Add sensor channels & baselines
                for feat_name, spec in feature_dict.items():
                    sensor = SensorChannel(
                        subsystem_id=sub.id,
                        channel_id=f"CH_{code}_{feat_name.upper()}",
                        name=f"{feat_name.replace('_', ' ').title()}",
                        sensor_type=feat_name,
                        unit=spec["unit"],
                        sampling_rate_hz=10.0,
                        description=f"Condition monitoring telemetry channel for {feat_name}"
                    )
                    db.add(sensor)
                    db.flush()

                    baseline = BaselineSignature(
                        subsystem_id=sub.id,
                        feature_name=feat_name,
                        baseline_mean=spec["mean"],
                        baseline_stddev=spec["std"],
                        sample_count=1000,
                        established_at=now - timedelta(days=14),
                        valid_until=now + timedelta(days=166),
                        operating_mode="NORMAL",
                        version="v1.0",
                        is_active=True
                    )
                    db.add(baseline)

                # Seed historical health trajectory (30 points over last 24 hours)
                base_hi = meta["initial_hi"]
                for i in range(30, 0, -1):
                    hist_time = now - timedelta(hours=i * 0.8)
                    # Slight random walk
                    jitter = random.gauss(0, 0.5)
                    if code == "RECOIL":
                        hi_point = max(75.0, min(100.0, 94.0 - (30 - i) * 0.2 + jitter))
                    else:
                        hi_point = max(88.0, min(100.0, base_hi + jitter))

                    band = (
                        "HEALTHY" if hi_point >= 90 else
                        "NORMAL / EARLY DEVIATION" if hi_point >= 75 else
                        "DEGRADING" if hi_point >= 50 else
                        "SIGNIFICANT DEGRADATION"
                    )

                    hi_rec = HealthIndexRecord(
                        subsystem_id=sub.id,
                        timestamp=hist_time,
                        health_index=round(hi_point, 2),
                        status_band=band,
                        contributing_features={},
                        feature_weights=weights,
                        formula_version="HI-WeightedDev-v1.0"
                    )
                    db.add(hi_rec)

            db.commit()

            # 4. Seed Alerts, Anomalies, and Maintenance events for rich initial visualization
            recoil_sub = db.query(Subsystem).filter(Subsystem.code == "RECOIL").first()
            lrf_sub = db.query(Subsystem).filter(Subsystem.code == "LRF").first()
            tech_user = db.query(User).filter(User.username == "tech").first()
            admin_user = db.query(User).filter(User.username == "admin").first()

            if recoil_sub and tech_user:
                anom1 = AnomalyEvent(
                    subsystem_id=recoil_sub.id,
                    feature_name="recoil_distance",
                    timestamp=now - timedelta(hours=2),
                    severity="WARNING",
                    anomaly_score=0.62,
                    deviation_value=312.0,
                    detection_method="Threshold Range Check (300-350 mm)",
                    model_version="Threshold-v1.0",
                    fault_diagnosis="Recoil Travel Warning (300-350 mm)",
                    raw_context={"current_value": 312.0, "unit": "mm", "normal_range": "250-300 mm"}
                )
                db.add(anom1)
                db.flush()

                alert1 = Alert(
                    subsystem_id=recoil_sub.id,
                    feature_name="recoil_distance",
                    timestamp=now - timedelta(hours=2),
                    severity="WARNING",
                    current_value=312.0,
                    baseline_value=275.0,
                    health_index_snapshot=88.5,
                    probable_issue="Recoil distance reading 312.0 mm extended into warning threshold band (300-350 mm).",
                    detection_method="Recoil Stroke Threshold Engine",
                    status="ACTIVE",
                    notes="Awaiting damper fluid and buffer seal inspection."
                )
                db.add(alert1)

                maint1 = MaintenanceEvent(
                    subsystem_id=recoil_sub.id,
                    anomaly_id=anom1.id,
                    event_type="INSPECTION",
                    description="Scheduled recoil buffer stroke measurement and oil level inspection.",
                    technician_id=tech_user.id,
                    operating_hours=recoil_sub.operating_hours,
                    operating_cycles=recoil_sub.operating_cycles,
                    maintenance_priority="MEDIUM",
                    recommendations="Inspect recoil buffer cylinder seals. Verify oil level in accumulator and confirm return stroke duration.",
                    created_at=now - timedelta(hours=1)
                )
                db.add(maint1)

            if lrf_sub and admin_user:
                alert2 = Alert(
                    subsystem_id=lrf_sub.id,
                    feature_name="detector_voltage",
                    timestamp=now - timedelta(hours=4),
                    severity="WARNING",
                    current_value=10.85,
                    baseline_value=11.5,
                    health_index_snapshot=93.2,
                    probable_issue="LRF detector voltage at 10.85 V entered low warning band (10.5-11.0 V).",
                    detection_method="Voltage Threshold Engine",
                    status="ACKNOWLEDGED",
                    acknowledged_by_id=tech_user.id if tech_user else None,
                    acknowledged_at=now - timedelta(hours=3),
                    notes="Acknowledged by technician. Power converter rail ripple to be verified."
                )
                db.add(alert2)

            # Audit log entry
            audit1 = AuditLogEntry(
                user_id=admin_user.id if admin_user else None,
                username="admin",
                role="ADMIN",
                action="SYSTEM_INIT",
                entity="Platform",
                entity_id="ROOT",
                description="Platform initialized with verified test-bench baseline signatures.",
                ip_address="127.0.0.1"
            )
            db.add(audit1)

            db.commit()

    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
    print("Database seeded successfully.")
