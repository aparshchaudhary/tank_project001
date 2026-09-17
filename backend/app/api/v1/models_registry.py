from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_admin, log_audit
from app.models.all_models import ModelVersion, User
from app.schemas.schemas import ModelVersionResponse

router = APIRouter()

@router.get("/", response_model=List[ModelVersionResponse])
def get_registered_models(db: Session = Depends(get_db)):
    return db.query(ModelVersion).order_by(ModelVersion.created_at.desc()).all()

@router.post("/{model_id}/rollback", response_model=ModelVersionResponse)
def rollback_model_version(
    model_id: str,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    model = db.query(ModelVersion).filter(ModelVersion.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model version not found")

    model.status = "ROLLED_BACK"
    log_audit(db, admin_user, "DEPLOY_MODEL", "ModelVersion", model.id, f"Rolled back {model.model_name} version {model.version}")
    db.commit()
    db.refresh(model)
    return model
