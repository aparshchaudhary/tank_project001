from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Set, Tuple
from collections import OrderedDict
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

class EdgeBufferService:
    def __init__(self, cache_size: int = settings.DEDUPLICATION_CACHE_SIZE, tolerance_sec: float = settings.OUT_OF_ORDER_TOLERANCE_SECONDS):
        self.cache_size = cache_size
        self.tolerance_sec = tolerance_sec
        # LRU cache of seen reading_ids for deduplication
        self._seen_ids: OrderedDict[str, float] = OrderedDict()
        # Edge store-and-forward staging queue
        self._offline_buffer: List[Dict[str, Any]] = []

    def check_reading_resilience(
        self,
        reading_id: str,
        timestamp: datetime
    ) -> Tuple[bool, bool, str]:
        """
        Validates deduplication and out-of-order arrival tolerance.
        Returns: (is_duplicate, is_out_of_order, message)
        """
        now = datetime.now(timezone.utc)
        if timestamp.tzinfo is None:
            timestamp = timestamp.replace(tzinfo=timezone.utc)

        # 1. Deduplication Check
        if reading_id in self._seen_ids:
            return True, False, f"Duplicate reading ID {reading_id} detected and rejected"

        # Record in LRU
        self._seen_ids[reading_id] = now.timestamp()
        if len(self._seen_ids) > self.cache_size:
            self._seen_ids.popitem(last=False)

        # 2. Out-of-Order Check
        age_seconds = (now - timestamp).total_seconds()
        is_out_of_order = False
        msg = "OK"

        if age_seconds > self.tolerance_sec:
            is_out_of_order = True
            msg = f"Reading timestamp is {round(age_seconds, 1)}s behind wall-clock; exceeds tolerance window of {self.tolerance_sec}s, processing with out-of-order tag"
        elif age_seconds < -10.0:
            is_out_of_order = True
            msg = f"Reading timestamp is in future by {round(abs(age_seconds), 1)}s; clock skew detected"

        return False, is_out_of_order, msg

    def buffer_offline_payload(self, payload: Dict[str, Any]):
        """Buffers data when backend database or network is momentarily unavailable (Store-and-Forward)"""
        self._offline_buffer.append(payload)
        if len(self._offline_buffer) > 5000:
            self._offline_buffer.pop(0)

    def drain_buffer(self) -> List[Dict[str, Any]]:
        drained = list(self._offline_buffer)
        self._offline_buffer.clear()
        return drained

    def get_buffer_stats(self) -> Dict[str, Any]:
        return {
            "cached_reading_ids": len(self._seen_ids),
            "offline_buffered_records": len(self._offline_buffer),
            "tolerance_window_sec": self.tolerance_sec
        }

edge_buffer_service = EdgeBufferService()
