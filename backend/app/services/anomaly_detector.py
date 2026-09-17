from datetime import datetime, timezone
from typing import Dict, Any, Optional, Tuple
from app.core.config import settings
from app.models.all_models import BaselineSignature, AnomalyEvent

class AnomalyDetector:
    def __init__(self, k_sigma: float = settings.DEFAULT_K_SIGMA):
        self.k_sigma = k_sigma
        self.model_version = "Statistical-kSigma-v1.0"

    def compute_deviation(self, current_val: float, baseline: BaselineSignature) -> Tuple[float, float]:
        """
        deviation_score(f) = min(1.0, abs(current_val - baseline_mean) / (k * baseline_stddev))
        Returns (deviation_score, raw_deviation)
        """
        raw_dev = abs(current_val - baseline.baseline_mean)
        denom = self.k_sigma * baseline.baseline_stddev
        if denom <= 0:
            denom = 1e-4
        score = min(1.0, raw_dev / denom)
        return round(score, 4), round(raw_dev, 4)

    def determine_severity(self, deviation_score: float) -> str:
        if deviation_score >= settings.ANOMALY_CRITICAL_THRESHOLD:
            return "CRITICAL"
        elif deviation_score >= settings.ANOMALY_WARNING_THRESHOLD:
            return "WARNING"
        return "NORMAL"

    def classify_fault(
        self,
        subsystem_code: str,
        feature_name: str,
        deviation_score: float,
        all_features: Dict[str, float]
    ) -> str:
        """
        Rule-based fault diagnosis with strict fallback to 'UNCLASSIFIED ANOMALY'.
        Never fabricates an operational diagnosis without sufficient signature correlation.
        """
        if deviation_score < settings.ANOMALY_WARNING_THRESHOLD:
            return "NORMAL OPERATION"

        # Bearing subsystem rules
        if "BEARING" in subsystem_code or feature_name.startswith("vibration"):
            v_rms = all_features.get("vibration_rms", 0.0)
            crest = all_features.get("crest_factor", 0.0)
            p2p = all_features.get("vibration_peak_to_peak", 0.0)
            if crest > 3.5 and v_rms > 2.0:
                return "Bearing Raceway Defect / Impact Shock"
            elif p2p > 4.0:
                return "Gear Mesh Backlash / Mechanical Wear"

        # Motor subsystem rules
        if "MOTOR" in subsystem_code or feature_name.startswith("motor"):
            m_curr = all_features.get("motor_rms_current", 0.0)
            m_var = all_features.get("motor_current_variation", 0.0)
            temp = all_features.get("temperature", 0.0)
            if temp > 75.0 and m_curr > 25.0:
                return "Motor Thermal Overload / Winding Stress"
            elif m_var > 3.0:
                return "Motor Drive Phase Ripple / Stator Asymmetry"

        # Hydraulic subsystem rules
        if "HYDRAULIC" in subsystem_code or feature_name.startswith("hydraulic"):
            p_var = all_features.get("hydraulic_pressure_variation", 0.0)
            flow = all_features.get("flow_deviation", 0.0)
            if p_var > 15.0:
                return "Hydraulic Circuit Aeration / Cavitation Ripple"
            elif flow > 5.0:
                return "Hydraulic Valve Bypass / Seal Leakage"

        # Position subsystem rules
        if "POSITION" in subsystem_code or feature_name.startswith("position"):
            pos_err = all_features.get("position_error", 0.0)
            overshoot = all_features.get("overshoot", 0.0)
            if pos_err > 0.05 and overshoot > 0.08:
                return "Resolver Feedback Drift / Drive Coupling Slip"
            elif pos_err > 0.03:
                return "Position Servo Tracking Deviation"

        # If evidence is insufficient or ambiguous
        return "UNCLASSIFIED ANOMALY"

    def evaluate_feature(
        self,
        subsystem_id: str,
        subsystem_code: str,
        feature_name: str,
        current_value: float,
        baseline: Optional[BaselineSignature],
        all_features: Dict[str, float],
        sensor_channel_id: Optional[str] = None
    ) -> Optional[AnomalyEvent]:
        if not baseline:
            return None

        dev_score, raw_dev = self.compute_deviation(current_value, baseline)
        severity = self.determine_severity(dev_score)
        
        # We record events when deviation trips warning or critical thresholds
        if severity in ["WARNING", "CRITICAL"]:
            diagnosis = self.classify_fault(subsystem_code, feature_name, dev_score, all_features)
            return AnomalyEvent(
                subsystem_id=subsystem_id,
                sensor_channel_id=sensor_channel_id,
                feature_name=feature_name,
                timestamp=datetime.now(timezone.utc),
                severity=severity,
                anomaly_score=dev_score,
                deviation_value=raw_dev,
                detection_method="k-sigma statistical deviation",
                model_version=self.model_version,
                fault_diagnosis=diagnosis,
                raw_context={
                    "current_value": current_value,
                    "baseline_mean": baseline.baseline_mean,
                    "baseline_stddev": baseline.baseline_stddev,
                    "k_sigma": self.k_sigma,
                    "all_features": all_features
                }
            )
        return None

anomaly_detector = AnomalyDetector()
