from typing import Dict, Any, Optional
from datetime import datetime, timezone

class TelemetryCache:
    """
    In-memory live telemetry cache holding the most recent feature values
    per subsystem. Initially empty until live sensor ingestion batches
    or telemetry readings arrive from the hardware/client.
    """
    def __init__(self):
        self._cache: Dict[str, Dict[str, float]] = {}
        self._has_live_data: bool = False
        self._total_readings_count: int = 0
        self._last_received_at: Optional[str] = None

    def update_features(self, subsystem_code: str, features: Dict[str, float]):
        code = str(subsystem_code).upper()
        if code not in self._cache:
            self._cache[code] = {}
        for k, v in features.items():
            try:
                self._cache[code][str(k).lower()] = float(v)
            except (ValueError, TypeError):
                pass
        if features:
            self._has_live_data = True
            self._total_readings_count += len(features)
            self._last_received_at = datetime.now(timezone.utc).isoformat()

    def has_live_data(self) -> bool:
        return self._has_live_data and len(self._cache) > 0

    def get_readings_count(self) -> int:
        return self._total_readings_count

    def get_last_received_at(self) -> Optional[str]:
        return self._last_received_at

    def get_features(self, subsystem_code: str) -> Dict[str, float]:
        code = str(subsystem_code).upper()
        return dict(self._cache.get(code, {}))

    def get_all(self) -> Dict[str, Dict[str, float]]:
        return {k: dict(v) for k, v in self._cache.items()}

    def reset(self):
        self._cache.clear()
        self._has_live_data = False
        self._total_readings_count = 0
        self._last_received_at = None

telemetry_cache = TelemetryCache()

