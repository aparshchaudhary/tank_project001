import pytest
from app.services.health_index_engine import health_index_engine
from app.models.all_models import Subsystem, BaselineSignature

def test_transparent_health_index_calculation():
    sub = Subsystem(
        id="sub-101",
        code="MOTOR",
        name="Servo Motor",
        category="Electrical",
        feature_weights={"motor_rms_current": 0.5, "temperature": 0.5}
    )

    baselines = {
        "motor_rms_current": BaselineSignature(
            subsystem_id="sub-101",
            feature_name="motor_rms_current",
            baseline_mean=10.0,
            baseline_stddev=1.0,
            sample_count=100
        ),
        "temperature": BaselineSignature(
            subsystem_id="sub-101",
            feature_name="temperature",
            baseline_mean=50.0,
            baseline_stddev=5.0,
            sample_count=100
        )
    }

    # Case 1: Healthy condition (at mean) -> HI = 100
    features_healthy = {"motor_rms_current": 10.0, "temperature": 50.0}
    hi, band, _, _ = health_index_engine.calculate_health_index(sub, features_healthy, baselines)
    assert hi == 100.0
    assert band == "HEALTHY"

    # Case 2: Maximum 3-sigma deviation on all features -> HI = 0.0
    # 10 + 3*1.0 = 13.0, 50 + 3*5.0 = 65.0
    features_crit = {"motor_rms_current": 13.0, "temperature": 65.0}
    hi_crit, band_crit, _, _ = health_index_engine.calculate_health_index(sub, features_crit, baselines)
    assert hi_crit == 0.0
    assert band_crit == "SEVERE CONDITION"
