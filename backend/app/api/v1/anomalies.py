from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.all_models import AnomalyEvent
from app.schemas.schemas import AnomalyEventResponse

router = APIRouter()

@router.get("/", response_model=List[AnomalyEventResponse])
def get_anomalies(
    subsystem_id: Optional[str] = None,
    severity: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    query = db.query(AnomalyEvent)
    if subsystem_id:
        query = query.filter(AnomalyEvent.subsystem_id == subsystem_id)
    if severity:
        query = query.filter(AnomalyEvent.severity == severity)
    
    return query.order_by(AnomalyEvent.timestamp.desc()).limit(limit).all()
