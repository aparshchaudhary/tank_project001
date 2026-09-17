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

        # 3. Seed Subsystems and Sensors
        if db.query(Subsystem).count() == 0:
            subsystems_meta = [
                {
                    "code": "TURRET_DRIVE",
                    "name": "Turret Azimuth Drive Subsystem",
                    "category": "Mechanical / Electric",
                    "description": "High-torque electric azimuth slew drive gear train and support casing.",
                    "hours": 342.5,
                    "cycles": 12800,
                    "initial_hi": 94.5
                },
                {
                    "code": "GEARBOX",
                    "name": "Main Reduction Gearbox",
                    "category": "Mechanical",
                    "description": "High-ratio precision planetary gearbox linking azimuth servo to ring gear.",
                    "hours": 342.5,
                    "cycles": 12800,
                    "initial_hi": 88.2
                },
                {
                    "code": "MOTOR",
                    "name": "Azimuth Servo Motor",
                    "category": "Electrical",
                    "description": "Permanent magnet synchronous drive motor with integral thermal feedback.",
                    "hours": 342.5,
                    "cycles": 12800,
                    "initial_hi": 91.0
                },
                {
                    "code": "HYDRAULIC_UNIT",
                    "name": "Hydraulic Elevation & Recoil Buffer",
                    "category": "Hydraulic",
                    "description": "Auxiliary laboratory test-bench elevation cylinder and damping accumulator.",
                    "hours": 210.0,
                    "cycles": 6450,
                    "initial_hi": 78.5
                },
                {
                    "code": "POSITION_SYSTEM",
                    "name": "Dual Resolver & Encoder System",
                    "category": "Sensor / Instrumentation",
                    "description": "Optical absolute encoder and high-frequency inductive position resolver.",
                    "hours": 342.5,
                    "cycles": 12800,
                    "initial_hi": 96.0
                },
                {
                    "code": "BEARING_SYSTEM",
                    "name": "Main Turret Ring & Race Bearing",
                    "category": "Mechanical",
                    "description": "Large diameter ball race bearing accommodating slew axial and radial loads.",
                    "hours": 342.5,
                    "cycles": 12800,
                    "initial_hi": 72.0 # In early degradation for rich demo
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
                    jitter = random.gauss(0, 0.6)
                    # For Bearing System, introduce a slight downward degradation curve to showcase RUL & trends!
                    if code == "BEARING_SYSTEM":
                        hi_point = max(65.0, min(100.0, 92.0 - (30 - i) * 0.7 + jitter))
                    elif code == "HYDRAULIC_UNIT":
                        hi_point = max(70.0, min(100.0, 85.0 - (30 - i) * 0.25 + jitter))
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
            bearing_sub = db.query(Subsystem).filter(Subsystem.code == "BEARING_SYSTEM").first()
            hydraulic_sub = db.query(Subsystem).filter(Subsystem.code == "HYDRAULIC_UNIT").first()
            tech_user = db.query(User).filter(User.username == "tech").first()
            admin_user = db.query(User).filter(User.username == "admin").first()

            if bearing_sub and tech_user:
                # Anomaly & Alert for Bearing
                anom1 = AnomalyEvent(
                    subsystem_id=bearing_sub.id,
                    feature_name="vibration_rms",
                    timestamp=now - timedelta(hours=3),
                    severity="WARNING",
                    anomaly_score=0.68,
                    deviation_value=0.22,
                    detection_method="k-sigma statistical deviation",
                    model_version="Statistical-kSigma-v1.0",
                    fault_diagnosis="Bearing Raceway Defect / Impact Shock",
                    raw_context={"current_value": 1.15, "baseline_mean": 0.65, "k_sigma": 3.0}
                )
                db.add(anom1)
                db.flush()

                alert1 = Alert(
                    subsystem_id=bearing_sub.id,
                    feature_name="vibration_rms",
                    timestamp=now - timedelta(hours=3),
                    severity="WARNING",
                    current_value=1.15,
                    baseline_value=0.65,
                    health_index_snapshot=74.2,
                    probable_issue="Elevated vibration RMS and crest factor in main ring bearing race.",
                    detection_method="Statistical Threshold Engine",
                    status="ACTIVE",
                    notes="Awaiting visual inspection and grease sampling."
                )
                db.add(alert1)

                # Maintenance Event
                maint1 = MaintenanceEvent(
                    subsystem_id=bearing_sub.id,
                    anomaly_id=anom1.id,
                    event_type="INSPECTION",
                    description="Scheduled visual inspection and grease contaminant check on bearing race.",
                    technician_id=tech_user.id,
                    operating_hours=bearing_sub.operating_hours,
                    operating_cycles=bearing_sub.operating_cycles,
                    maintenance_priority="HIGH",
                    recommendations="Inspect monitored subsystem. Verify race seal integrity and relubricate with certified synthetic grease.",
                    created_at=now - timedelta(hours=2)
                )
                db.add(maint1)

            if hydraulic_sub and admin_user:
                alert2 = Alert(
                    subsystem_id=hydraulic_sub.id,
                    feature_name="hydraulic_pressure_variation",
                    timestamp=now - timedelta(hours=5),
                    severity="WARNING",
                    current_value=8.2,
                    baseline_value=4.5,
                    health_index_snapshot=78.5,
                    probable_issue="Pressure fluctuation ripple in elevation cylinder circuit.",
                    detection_method="Statistical Threshold Engine",
                    status="ACKNOWLEDGED",
                    acknowledged_by_id=tech_user.id if tech_user else None,
                    acknowledged_at=now - timedelta(hours=4),
                    notes="Acknowledged by technician. Pressure accumulator pre-charge will be tested."
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
