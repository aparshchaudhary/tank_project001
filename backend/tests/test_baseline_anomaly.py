import pytest
from app.services.baseline_engine import baseline_engine
from app.services.anomaly_detector import anomaly_detector
from app.models.all_models import BaselineSignature

def test_baseline_calculation():
    samples = [10.0, 10.2, 9.8, 10.1, 9.9, 10.0]
    stats = baseline_engine.compute_baseline_from_samples(samples)
    assert stats["count"] == 6
    assert abs(stats["mean"] - 10.0) < 0.1
    assert stats["stddev"] > 0.0

def test_k_sigma_deviation_and_severity():
    base = BaselineSignature(
        subsystem_id="sub-1",
        feature_name="vibration_rms",
        baseline_mean=1.0,
        baseline_stddev=0.1,
        sample_count=100
    )
    
    # Value at mean has 0 deviation
    dev_score, _ = anomaly_detector.compute_deviation(1.0, base)
    assert dev_score == 0.0
    assert anomaly_detector.determine_severity(dev_score) == "NORMAL"

    # Value 3*sigma away (1.3) gives score = 1.0 (Critical)
    dev_score_crit, _ = anomaly_detector.compute_deviation(1.3, base)
    assert dev_score_crit == 1.0
    assert anomaly_detector.determine_severity(dev_score_crit) == "CRITICAL"

def test_unclassified_anomaly_fallback():
    # If deviation is high but doesn't match specific subsystem rules, must return UNCLASSIFIED ANOMALY
    diagnosis = anomaly_detector.classify_fault(
        subsystem_code="UNKNOWN_SUBSYSTEM",
        feature_name="temperature",
        deviation_score=0.9,
        all_features={"temperature": 80.0}
    )
    assert diagnosis == "UNCLASSIFIED ANOMALY"
