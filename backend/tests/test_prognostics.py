import uuid
from datetime import datetime, timezone, timedelta
from app.services.prognostics_rul import prognostics_engine
from app.core.database import SessionLocal, Base, engine
from app.models.all_models import Subsystem, HealthIndexRecord

def test_rul_insufficient_data_safeguard():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Create a subsystem with 0 health records (< 20 required threshold)
        unique_code = f"TEST_SUB_RUL_{uuid.uuid4().hex[:8]}"
        sub = Subsystem(
            code=unique_code,
            name="Test Subsystem for RUL",
            category="Mechanical"
        )
        db.add(sub)
        db.commit()
        db.refresh(sub)

        # Query RUL
        result = prognostics_engine.estimate_rul(db, sub.id)
        assert result["status"] == "INSUFFICIENT_DATA"
        assert result["rul_hours"] is None
        assert "INSUFFICIENT DATA" in result["message"]
    finally:
        db.close()
