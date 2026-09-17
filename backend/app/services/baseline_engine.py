from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional
import numpy as np
from sqlalchemy.orm import Session

from app.models.all_models import BaselineSignature, Subsystem, FeatureRecord

class BaselineEngine:
    @staticmethod
    def compute_baseline_from_samples(
        feature_values: List[float]
    ) -> Dict[str, float]:
        if not feature_values:
            return {"mean": 0.0, "stddev": 1.0, "count": 0}
        
        arr = np.array(feature_values, dtype=float)
        mean = float(np.mean(arr))
        std = float(np.std(arr))
        # Safeguard against zero stddev to prevent division by zero
        if std < 1e-4:
            std = max(0.05 * abs(mean), 0.01)
            
        return {
            "mean": round(mean, 4),
            "stddev": round(std, 4),
            "count": len(feature_values)
        }

    @staticmethod
    def get_active_baselines(db: Session, subsystem_id: str) -> Dict[str, BaselineSignature]:
        baselines = db.query(BaselineSignature).filter(
            BaselineSignature.subsystem_id == subsystem_id,
            BaselineSignature.is_active == True
        ).all()
        return {b.feature_name: b for b in baselines}

    @staticmethod
    def establish_baseline_signature(
        db: Session,
        subsystem_id: str,
        feature_name: str,
        feature_values: List[float],
        operating_mode: str = "NORMAL",
        version: str = "v1.0",
        valid_days: int = 180
    ) -> BaselineSignature:
        stats = BaselineEngine.compute_baseline_from_samples(feature_values)
        now = datetime.now(timezone.utc)
        valid_until = now + timedelta(days=valid_days)

        # Deactivate older baselines for this feature/subsystem
        db.query(BaselineSignature).filter(
            BaselineSignature.subsystem_id == subsystem_id,
            BaselineSignature.feature_name == feature_name,
            BaselineSignature.is_active == True
        ).update({"is_active": False})

        sig = BaselineSignature(
            subsystem_id=subsystem_id,
            feature_name=feature_name,
            baseline_mean=stats["mean"],
            baseline_stddev=stats["stddev"],
            sample_count=stats["count"],
            established_at=now,
            valid_until=valid_until,
            operating_mode=operating_mode,
            version=version,
            is_active=True
        )
        db.add(sig)
        db.commit()
        db.refresh(sig)
        return sig

    @staticmethod
    def rebaseline_subsystem(
        db: Session,
        subsystem_id: str,
        new_version_tag: str = "v1.1"
    ) -> List[BaselineSignature]:
        # Fetch recent feature records for this subsystem from healthy operations
        recent_features = db.query(FeatureRecord).filter(
            FeatureRecord.subsystem_id == subsystem_id
        ).order_by(FeatureRecord.timestamp.desc()).limit(300).all()

        feature_groups: Dict[str, List[float]] = {}
        for feat in recent_features:
            feature_groups.setdefault(feat.feature_name, []).append(feat.feature_value)

        updated_signatures = []
        for feat_name, vals in feature_groups.items():
            if len(vals) >= 5:
                sig = BaselineEngine.establish_baseline_signature(
                    db=db,
                    subsystem_id=subsystem_id,
                    feature_name=feat_name,
                    feature_values=vals,
                    version=new_version_tag
                )
                updated_signatures.append(sig)

        return updated_signatures

baseline_engine = BaselineEngine()
