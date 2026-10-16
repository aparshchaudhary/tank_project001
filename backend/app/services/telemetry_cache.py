from typing import Dict, Any, Optional
from app.simulator.scenarios import NOMINAL_BASELINES

class TelemetryCache:
    """
    In-memory live telemetry cache holding the most recent feature values
    per subsystem. Pre-seeded with nominal baselines, dynamically updated
    by live sensor ingestion batches and simulator ticks.
    """
    def __init__(self):
        self._cache: Dict[str, Dict[str, float]] = {
            sub: {feat: float(data["mean"]) for feat, data in features.items()}
            for sub, features in NOMINAL_BASELINES.items()
        }

    def update_features(self, subsystem_code: str, features: Dict[str, float]):
        code = str(subsystem_code).upper()
        if code not in self._cache:
            self._cache[code] = {}
        for k, v in features.items():
            try:
                self._cache[code][str(k).lower()] = float(v)
            except (ValueError, TypeError):
                pass

    def get_features(self, subsystem_code: str) -> Dict[str, float]:
        code = str(subsystem_code).upper()
        return dict(self._cache.get(code, {}))

    def get_all(self) -> Dict[str, Dict[str, float]]:
        return {k: dict(v) for k, v in self._cache.items()}

telemetry_cache = TelemetryCache()
