from datetime import datetime, timezone
from typing import Dict, Any, Optional
import numpy as np
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.all_models import HealthIndexRecord

class PrognosticsEngine:
    MODEL_VERSION = "RUL-DegradationTrend-v1.0"

    @classmethod
    def estimate_rul(cls, db: Session, subsystem_id: str) -> Dict[str, Any]:
        """
        Calculates Remaining Useful Life (RUL) only if sufficient historical degradation data exists.
        Safeguards against data fabrication by strictly reporting 'INSUFFICIENT_DATA' when conditions are not met.
        """
        now = datetime.now(timezone.utc)
        
        # Query historical health records for the subsystem ordered by time ascending
        records = db.query(HealthIndexRecord).filter(
            HealthIndexRecord.subsystem_id == subsystem_id
        ).order_by(HealthIndexRecord.timestamp.asc()).all()

        total_samples = len(records)
        
        # Rule 1: Minimum sample count threshold
        if total_samples < settings.RUL_MIN_DEGRADATION_SAMPLES:
            return {
                "subsystem_id": subsystem_id,
                "status": "INSUFFICIENT_DATA",
                "rul_hours": None,
                "confidence_score": None,
                "degradation_rate_per_hour": None,
                "samples_analyzed": total_samples,
                "message": f"RUL: INSUFFICIENT DATA (Requires at least {settings.RUL_MIN_DEGRADATION_SAMPLES} samples; {total_samples} recorded)",
                "prognostics_model_version": cls.MODEL_VERSION,
                "calculated_at": now
            }

        # Filter to recent trajectory (last 100 samples)
        recent = records[-100:]
        times = [r.timestamp.timestamp() for r in recent]
        health_scores = [r.health_index for r in recent]

        # Check if subsystem is actually exhibiting a downward degradation trend
        start_time = times[0]
        norm_times_hours = [(t - start_time) / 3600.0 for t in times]
        
        # Fit linear degradation slope
        x = np.array(norm_times_hours)
        y = np.array(health_scores)
        
        # If time span is negligible (less than 1 minute)
        if x[-1] - x[0] < 0.01:
            return {
                "subsystem_id": subsystem_id,
                "status": "INSUFFICIENT_DATA",
                "rul_hours": None,
                "confidence_score": None,
                "degradation_rate_per_hour": None,
                "samples_analyzed": total_samples,
                "message": "RUL: INSUFFICIENT DATA (Time span too short for trend extrapolation)",
                "prognostics_model_version": cls.MODEL_VERSION,
                "calculated_at": now
            }

        slope, intercept = np.polyfit(x, y, 1) # slope in health_index / hour

        # If system is healthy and stable or improving (slope >= 0), RUL is not applicable or indefinite
        if slope >= -0.05:
            return {
                "subsystem_id": subsystem_id,
                "status": "HEALTHY_STABLE",
                "rul_hours": None,
                "confidence_score": 0.95,
                "degradation_rate_per_hour": round(float(slope), 3),
                "samples_analyzed": total_samples,
                "message": "RUL: System operating within healthy baseline limits (no active degradation trend detected)",
                "prognostics_model_version": cls.MODEL_VERSION,
                "calculated_at": now
            }

        # Calculate time until health index reaches critical threshold (default 25.0)
        current_hi = y[-1]
        target_hi = settings.RUL_CRITICAL_HEALTH_THRESHOLD
        
        if current_hi <= target_hi:
            remaining_hours = 0.0
        else:
            remaining_hours = float((target_hi - current_hi) / slope) # slope is negative, result positive

        # Calculate R^2 correlation as confidence score
        y_pred = slope * x + intercept
        ss_res = np.sum((y - y_pred) ** 2)
        ss_tot = np.sum((y - np.mean(y)) ** 2) + 1e-6
        r2 = max(0.0, min(1.0, 1.0 - (ss_res / ss_tot)))

        return {
            "subsystem_id": subsystem_id,
            "status": "COMPUTED",
            "rul_hours": round(max(0.0, remaining_hours), 1),
            "confidence_score": round(float(r2), 2),
            "degradation_rate_per_hour": round(float(abs(slope)), 3),
            "samples_analyzed": total_samples,
            "message": f"Estimated {round(remaining_hours, 1)} operating hours until critical service limit (Confidence: {int(r2 * 100)}%)",
            "prognostics_model_version": cls.MODEL_VERSION,
            "calculated_at": now
        }

prognostics_engine = PrognosticsEngine()
