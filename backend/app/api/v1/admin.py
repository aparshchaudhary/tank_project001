from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_password_hash
from app.core.dependencies import require_admin, log_audit
from app.models.all_models import User, Subsystem, BaselineSignature
from app.schemas.schemas import UserResponse, UserCreate, RebaselineRequest, BaselineSignatureResponse
from app.services.baseline_engine import baseline_engine

router = APIRouter()

@router.get("/users", response_model=List[UserResponse])
def get_users(
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    return db.query(User).all()

@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    existing = db.query(User).filter(
        (User.username == payload.username) | (User.email == payload.email)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username or email already registered")

    user = User(
        username=payload.username,
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        full_name=payload.full_name,
        role=payload.role
    )
    db.add(user)
    log_audit(db, admin_user, "USER_MGMT", "User", user.id, f"Created new user account for {user.username} with role {user.role}")
    db.commit()
    db.refresh(user)
    return user

@router.post("/rebaseline", response_model=List[BaselineSignatureResponse])
def trigger_subsystem_rebaseline(
    payload: RebaselineRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    subsystem = db.query(Subsystem).filter(
        (Subsystem.id == payload.subsystem_id) | (Subsystem.code == payload.subsystem_id)
    ).first()
    if not subsystem:
        raise HTTPException(status_code=404, detail="Subsystem not found")

    new_sigs = baseline_engine.rebaseline_subsystem(db, subsystem.id)
    log_audit(
        db, admin_user, "CREATE_BASELINE", "Subsystem", subsystem.id,
        f"Rebaselined {subsystem.name}. Reason: {payload.reason}"
    )
    return new_sigs

@router.get("/system-config")
def get_system_config(admin_user: User = Depends(require_admin)):
    return {
        "project_name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "k_sigma": settings.DEFAULT_K_SIGMA,
        "warning_threshold": settings.ANOMALY_WARNING_THRESHOLD,
        "critical_threshold": settings.ANOMALY_CRITICAL_THRESHOLD,
        "out_of_order_tolerance_sec": settings.OUT_OF_ORDER_TOLERANCE_SECONDS,
        "rul_min_samples": settings.RUL_MIN_DEGRADATION_SAMPLES,
        "health_bands": {
            "HEALTHY": [settings.HEALTH_BAND_HEALTHY, 100.0],
            "NORMAL_EARLY_DEV": [settings.HEALTH_BAND_EARLY_DEV, settings.HEALTH_BAND_HEALTHY],
            "DEGRADING": [settings.HEALTH_BAND_DEGRADING, settings.HEALTH_BAND_EARLY_DEV],
            "SIGNIFICANT_DEG": [settings.HEALTH_BAND_SIGNIFICANT_DEG, settings.HEALTH_BAND_DEGRADING],
            "SEVERE": [0.0, settings.HEALTH_BAND_SIGNIFICANT_DEG]
        }
    }
