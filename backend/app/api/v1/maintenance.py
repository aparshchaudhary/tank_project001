from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_technician, get_current_active_user
from app.models.all_models import MaintenanceEvent, Subsystem, User
from app.schemas.schemas import MaintenanceEventCreate, MaintenanceEventResponse
from app.services.maintenance_service import maintenance_service

router = APIRouter()

@router.get("/events", response_model=List[MaintenanceEventResponse])
def get_maintenance_events(
    subsystem_id: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    query = db.query(MaintenanceEvent)
    if subsystem_id:
        query = query.filter(MaintenanceEvent.subsystem_id == subsystem_id)
    
    events = query.order_by(MaintenanceEvent.created_at.desc()).limit(limit).all()

    subsystems = {s.id: s.name for s in db.query(Subsystem).all()}
    users = {u.id: u.full_name for u in db.query(User).all()}

    return [
        MaintenanceEventResponse(
            id=e.id,
            subsystem_id=e.subsystem_id,
            subsystem_name=subsystems.get(e.subsystem_id, e.subsystem_id),
            anomaly_id=e.anomaly_id,
            event_type=e.event_type,
            description=e.description,
            technician_id=e.technician_id,
            technician_name=users.get(e.technician_id),
            operating_hours=e.operating_hours,
            operating_cycles=e.operating_cycles,
            maintenance_priority=e.maintenance_priority,
            recommendations=e.recommendations,
            created_at=e.created_at
        )
        for e in events
    ]

@router.post("/events", response_model=MaintenanceEventResponse, status_code=status.HTTP_201_CREATED)
def create_maintenance_event(
    payload: MaintenanceEventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_technician)
):
    try:
        event = maintenance_service.create_maintenance_event(
            db=db,
            subsystem_id=payload.subsystem_id,
            user=current_user,
            event_type=payload.event_type,
            description=payload.description,
            anomaly_id=payload.anomaly_id,
            operating_hours=payload.operating_hours,
            operating_cycles=payload.operating_cycles,
            maintenance_priority=payload.maintenance_priority,
            recommendations=payload.recommendations
        )
        sub = db.query(Subsystem).filter(Subsystem.id == event.subsystem_id).first()
        return MaintenanceEventResponse(
            id=event.id,
            subsystem_id=event.subsystem_id,
            subsystem_name=sub.name if sub else event.subsystem_id,
            anomaly_id=event.anomaly_id,
            event_type=event.event_type,
            description=event.description,
            technician_id=event.technician_id,
            technician_name=current_user.full_name,
            operating_hours=event.operating_hours,
            operating_cycles=event.operating_cycles,
            maintenance_priority=event.maintenance_priority,
            recommendations=event.recommendations,
            created_at=event.created_at
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
