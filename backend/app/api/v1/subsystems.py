from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_admin, require_viewer, get_current_active_user, log_audit
from app.models.all_models import Subsystem, SensorChannel, BaselineSignature, AnomalyEvent, Alert, User
from app.schemas.schemas import SubsystemResponse, SubsystemDetailResponse, FeatureWeightUpdate
from app.services.prognostics_rul import prognostics_engine

router = APIRouter()

@router.get("/", response_model=List[SubsystemResponse])
def get_all_subsystems(db: Session = Depends(get_db)):
    subsystems = db.query(Subsystem).all()
    SUBSYSTEM_ORDER = ["LRF", "ALG", "RECOIL", "ELEVATION", "AZIMUTH", "TRAVERSE"]
    subsystems.sort(key=lambda s: SUBSYSTEM_ORDER.index(s.code) if s.code in SUBSYSTEM_ORDER else 99)
    results = []
    for s in subsystems:
        active_alerts = db.query(Alert).filter(
            Alert.subsystem_id == s.id,
            Alert.status.in_(["ACTIVE", "ACKNOWLEDGED"])
        ).count()
        
        status_band = (
            "HEALTHY" if s.current_health_index >= 90 else
            "NORMAL / EARLY DEVIATION" if s.current_health_index >= 75 else
            "DEGRADING" if s.current_health_index >= 50 else
            "SIGNIFICANT DEGRADATION" if s.current_health_index >= 25 else
            "SEVERE CONDITION"
        )
        
        results.append(SubsystemResponse(
            id=s.id,
            code=s.code,
            name=s.name,
            description=s.description,
            category=s.category,
            is_active=s.is_active,
            operating_hours=s.operating_hours,
            operating_cycles=s.operating_cycles,
            current_health_index=s.current_health_index,
            feature_weights=s.feature_weights or {},
            status_band=status_band,
            active_alert_count=active_alerts,
            trend_direction="DEGRADING" if s.current_health_index < 75 else "STABLE"
        ))
    return results

@router.get("/{subsystem_id}", response_model=SubsystemDetailResponse)
def get_subsystem_detail(subsystem_id: str, db: Session = Depends(get_db)):
    s = db.query(Subsystem).filter(
        (Subsystem.id == subsystem_id) | (Subsystem.code == subsystem_id)
    ).first()
    if not s:
        raise HTTPException(status_code=404, detail="Subsystem not found")

    sensors = db.query(SensorChannel).filter(SensorChannel.subsystem_id == s.id).all()
    baselines = db.query(BaselineSignature).filter(
        BaselineSignature.subsystem_id == s.id,
        BaselineSignature.is_active == True
    ).all()
    anomalies = db.query(AnomalyEvent).filter(
        AnomalyEvent.subsystem_id == s.id
    ).order_by(AnomalyEvent.timestamp.desc()).limit(15).all()
    active_alerts = db.query(Alert).filter(
        Alert.subsystem_id == s.id,
        Alert.status.in_(["ACTIVE", "ACKNOWLEDGED"])
    ).count()

    rul_estimate = prognostics_engine.estimate_rul(db, s.id)

    status_band = (
        "HEALTHY" if s.current_health_index >= 90 else
        "NORMAL / EARLY DEVIATION" if s.current_health_index >= 75 else
        "DEGRADING" if s.current_health_index >= 50 else
        "SIGNIFICANT DEGRADATION" if s.current_health_index >= 25 else
        "SEVERE CONDITION"
    )

    return SubsystemDetailResponse(
        id=s.id,
        code=s.code,
        name=s.name,
        description=s.description,
        category=s.category,
        is_active=s.is_active,
        operating_hours=s.operating_hours,
        operating_cycles=s.operating_cycles,
        current_health_index=s.current_health_index,
        feature_weights=s.feature_weights or {},
        status_band=status_band,
        active_alert_count=active_alerts,
        trend_direction="DEGRADING" if s.current_health_index < 75 else "STABLE",
        sensors=sensors,
        active_baselines=baselines,
        recent_anomalies=anomalies,
        rul_info=rul_estimate
    )

@router.put("/{subsystem_id}/weights", response_model=SubsystemResponse)
def update_feature_weights(
    subsystem_id: str,
    weights_update: FeatureWeightUpdate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    s = db.query(Subsystem).filter(Subsystem.id == subsystem_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Subsystem not found")

    s.feature_weights = weights_update.feature_weights
    log_audit(db, admin_user, "CONFIG_CHANGE", "Subsystem", s.id, f"Updated feature weights for {s.name}")
    db.commit()
    db.refresh(s)

    return SubsystemResponse(
        id=s.id,
        code=s.code,
        name=s.name,
        description=s.description,
        category=s.category,
        is_active=s.is_active,
        operating_hours=s.operating_hours,
        operating_cycles=s.operating_cycles,
        current_health_index=s.current_health_index,
        feature_weights=s.feature_weights or {},
        status_band="HEALTHY"
    )
