from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.all_models import Subsystem
from app.schemas.schemas import RulResponse
from app.services.prognostics_rul import prognostics_engine

router = APIRouter()

@router.get("/{subsystem_id}/rul", response_model=RulResponse)
def get_subsystem_rul(subsystem_id: str, db: Session = Depends(get_db)):
    sub = db.query(Subsystem).filter(
        (Subsystem.id == subsystem_id) | (Subsystem.code == subsystem_id)
    ).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subsystem not found")

    result = prognostics_engine.estimate_rul(db, sub.id)
    return result
