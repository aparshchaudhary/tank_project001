from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_technician, get_current_active_user
from app.models.all_models import Alert, Subsystem, User
from app.schemas.schemas import AlertResponse, AlertAcknowledgeRequest, AlertResolveRequest
from app.services.alert_service import alert_service

router = APIRouter()

@router.get("/", response_model=List[AlertResponse])
def get_alerts(
    subsystem_id: Optional[str] = None,
    severity: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    query = db.query(Alert)
    if subsystem_id:
        query = query.filter(Alert.subsystem_id == subsystem_id)
    if severity:
        query = query.filter(Alert.severity == severity)
    if status_filter:
        query = query.filter(Alert.status == status_filter)

    alerts = query.order_by(Alert.timestamp.desc()).limit(limit).all()

    # Pre-fetch subsystems and users for clean join display
    subsystems = {s.id: s.name for s in db.query(Subsystem).all()}
    users = {u.id: u.full_name for u in db.query(User).all()}

    results = []
    for a in alerts:
        results.append(AlertResponse(
            id=a.id,
            subsystem_id=a.subsystem_id,
            subsystem_name=subsystems.get(a.subsystem_id, a.subsystem_id),
            sensor_channel_id=a.sensor_channel_id,
            feature_name=a.feature_name,
            timestamp=a.timestamp,
            severity=a.severity,
            current_value=a.current_value,
            baseline_value=a.baseline_value,
            health_index_snapshot=a.health_index_snapshot,
            probable_issue=a.probable_issue,
            detection_method=a.detection_method,
            status=a.status,
            acknowledged_by_id=a.acknowledged_by_id,
            acknowledged_by_name=users.get(a.acknowledged_by_id),
            acknowledged_at=a.acknowledged_at,
            resolved_by_id=a.resolved_by_id,
            resolved_by_name=users.get(a.resolved_by_id),
            resolved_at=a.resolved_at,
            notes=a.notes,
            created_at=a.created_at
        ))
    return results

@router.post("/{alert_id}/acknowledge", response_model=AlertResponse)
def acknowledge_alert(
    alert_id: str,
    body: AlertAcknowledgeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_technician)
):
    try:
        updated = alert_service.acknowledge_alert(db, alert_id, current_user, body.notes)
        sub = db.query(Subsystem).filter(Subsystem.id == updated.subsystem_id).first()
        return AlertResponse(
            id=updated.id,
            subsystem_id=updated.subsystem_id,
            subsystem_name=sub.name if sub else updated.subsystem_id,
            sensor_channel_id=updated.sensor_channel_id,
            feature_name=updated.feature_name,
            timestamp=updated.timestamp,
            severity=updated.severity,
            current_value=updated.current_value,
            baseline_value=updated.baseline_value,
            health_index_snapshot=updated.health_index_snapshot,
            probable_issue=updated.probable_issue,
            detection_method=updated.detection_method,
            status=updated.status,
            acknowledged_by_id=updated.acknowledged_by_id,
            acknowledged_by_name=current_user.full_name,
            acknowledged_at=updated.acknowledged_at,
            resolved_by_id=updated.resolved_by_id,
            resolved_at=updated.resolved_at,
            notes=updated.notes,
            created_at=updated.created_at
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/{alert_id}/resolve", response_model=AlertResponse)
def resolve_alert(
    alert_id: str,
    body: AlertResolveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_technician)
):
    try:
        updated = alert_service.resolve_alert(db, alert_id, current_user, body.resolution_notes)
        sub = db.query(Subsystem).filter(Subsystem.id == updated.subsystem_id).first()
        return AlertResponse(
            id=updated.id,
            subsystem_id=updated.subsystem_id,
            subsystem_name=sub.name if sub else updated.subsystem_id,
            sensor_channel_id=updated.sensor_channel_id,
            feature_name=updated.feature_name,
            timestamp=updated.timestamp,
            severity=updated.severity,
            current_value=updated.current_value,
            baseline_value=updated.baseline_value,
            health_index_snapshot=updated.health_index_snapshot,
            probable_issue=updated.probable_issue,
            detection_method=updated.detection_method,
            status=updated.status,
            acknowledged_by_id=updated.acknowledged_by_id,
            acknowledged_at=updated.acknowledged_at,
            resolved_by_id=updated.resolved_by_id,
            resolved_by_name=current_user.full_name,
            resolved_at=updated.resolved_at,
            notes=updated.notes,
            created_at=updated.created_at
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
