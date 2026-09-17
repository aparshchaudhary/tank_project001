from datetime import datetime, timezone
from typing import Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.all_models import Subsystem, HealthIndexRecord, BaselineSignature

class HealthIndexEngine:
    FORMULA_VERSION = "HI-WeightedDev-v1.0"

    @staticmethod
    def determine_status_band(health_index: float) -> str:
        if health_index >= settings.HEALTH_BAND_HEALTHY:
            return "HEALTHY"
        elif health_index >= settings.HEALTH_BAND_EARLY_DEV:
            return "NORMAL / EARLY DEVIATION"
        elif health_index >= settings.HEALTH_BAND_DEGRADING:
            return "DEGRADING"
        elif health_index >= settings.HEALTH_BAND_SIGNIFICANT_DEG:
            return "SIGNIFICANT DEGRADATION"
        return "SEVERE CONDITION"

    @classmethod
    def calculate_health_index(
        cls,
        subsystem: Subsystem,
        current_features: Dict[str, float],
        baselines: Dict[str, BaselineSignature],
        k_sigma: float = settings.DEFAULT_K_SIGMA
    ) -> Tuple[float, str, Dict[str, float], Dict[str, float]]:
        """
        Health Index = 100 * (1 - weighted_average(deviation_score))
        Returns: (health_index, status_band, contributing_devs, normalized_weights)
        """
        if not current_features or not baselines:
            return 100.0, "HEALTHY", {}, {}

        weights = subsystem.feature_weights or {}
        # Ensure default weights if subsystem has no custom configured weights
        configured_features = [f for f in current_features.keys() if f in baselines]
        if not configured_features:
            return 100.0, "HEALTHY", {}, {}

        # Build weights for available features
        assigned_weights: Dict[str, float] = {}
        for f in configured_features:
            assigned_weights[f] = float(weights.get(f, 1.0))

        total_weight = sum(assigned_weights.values())
        if total_weight <= 0:
            total_weight = float(len(configured_features))
            for f in configured_features:
                assigned_weights[f] = 1.0

        normalized_weights = {f: w / total_weight for f, w in assigned_weights.items()}

        # Compute deviations
        deviations: Dict[str, float] = {}
        weighted_sum = 0.0

        for f, weight in normalized_weights.items():
            val = current_features[f]
            base = baselines[f]
            denom = k_sigma * base.baseline_stddev
            if denom <= 0:
                denom = 1e-4
            dev_score = min(1.0, abs(val - base.baseline_mean) / denom)
            deviations[f] = round(dev_score, 4)
            weighted_sum += weight * dev_score

        health_index = max(0.0, min(100.0, 100.0 * (1.0 - weighted_sum)))
        health_index = round(health_index, 2)
        status_band = cls.determine_status_band(health_index)

        return health_index, status_band, deviations, normalized_weights

    @classmethod
    def record_health_index(
        cls,
        db: Session,
        subsystem: Subsystem,
        current_features: Dict[str, float],
        baselines: Dict[str, BaselineSignature],
        timestamp: Optional[datetime] = None
    ) -> HealthIndexRecord:
        hi, band, devs, weights = cls.calculate_health_index(subsystem, current_features, baselines)
        ts = timestamp or datetime.now(timezone.utc)

        record = HealthIndexRecord(
            subsystem_id=subsystem.id,
            timestamp=ts,
            health_index=hi,
            status_band=band,
            contributing_features=devs,
            feature_weights=weights,
            formula_version=cls.FORMULA_VERSION
        )
        db.add(record)
        
        # Update current snapshot on subsystem
        subsystem.current_health_index = hi
        db.commit()
        db.refresh(record)
        return record

health_index_engine = HealthIndexEngine()
