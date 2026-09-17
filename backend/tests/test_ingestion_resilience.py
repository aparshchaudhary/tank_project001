from datetime import datetime, timezone, timedelta
from app.services.buffer_service import EdgeBufferService

def test_deduplication_detection():
    service = EdgeBufferService(cache_size=100, tolerance_sec=60.0)
    now = datetime.now(timezone.utc)

    # First arrival
    is_dup, _, _ = service.check_reading_resilience("READING_001", now)
    assert not is_dup

    # Second arrival of same ID
    is_dup2, _, msg = service.check_reading_resilience("READING_001", now)
    assert is_dup2
    assert "Duplicate" in msg

def test_out_of_order_tolerance_window():
    service = EdgeBufferService(cache_size=100, tolerance_sec=60.0)
    now = datetime.now(timezone.utc)

    # Arriving 20 seconds late (within 60s window) -> tolerated
    is_dup, is_ooo, msg = service.check_reading_resilience("READING_002", now - timedelta(seconds=20))
    assert not is_dup
    assert not is_ooo

    # Arriving 150 seconds late (beyond 60s window) -> flagged as out-of-order
    is_dup, is_ooo_late, msg = service.check_reading_resilience("READING_003", now - timedelta(seconds=150))
    assert not is_dup
    assert is_ooo_late
    assert "exceeds tolerance window" in msg
