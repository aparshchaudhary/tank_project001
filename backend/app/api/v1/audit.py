from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.all_models import AuditLogEntry
from app.schemas.schemas import AuditLogResponse

router = APIRouter()

@router.get("/", response_model=List[AuditLogResponse])
def get_audit_logs(
    action: Optional[str] = None,
    entity: Optional[str] = None,
    username: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    query = db.query(AuditLogEntry)
    if action:
        query = query.filter(AuditLogEntry.action == action)
    if entity:
        query = query.filter(AuditLogEntry.entity == entity)
    if username:
        query = query.filter(AuditLogEntry.username.ilike(f"%{username}%"))

    return query.order_by(AuditLogEntry.timestamp.desc()).limit(limit).all()
