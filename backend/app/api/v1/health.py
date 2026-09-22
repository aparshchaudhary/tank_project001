from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.all_models import Subsystem, HealthIndexRecord, Alert, SensorChannel
from app.schemas.schemas import SystemOverviewResponse, SubsystemResponse, AlertResponse, HealthIndexHistoryItem

router = APIRouter()

@router.get("/overview", response_model=SystemOverviewResponse)
def get_system_overview(db: Session = Depends(get_db)):
    subsystems = db.query(Subsystem).all()
    sensors_count = db.query(SensorChannel).filter(SensorChannel.is_active == True).count()
    
    active_alerts = db.query(Alert).filter(Alert.status.in_(["ACTIVE", "ACKNOWLEDGED"])).order_by(Alert.timestamp.desc()).all()
    warnings = [a for a in active_alerts if a.severity == "WARNING"]
    criticals = [a for a in active_alerts if a.severity == "CRITICAL"]

    SUBSYSTEM_ORDER = ["LRF", "ALG", "RECOIL", "ELEVATION", "AZIMUTH", "TRAVERSE"]
    subsystems.sort(key=lambda s: SUBSYSTEM_ORDER.index(s.code) if s.code in SUBSYSTEM_ORDER else 99)

    subsystems_responses = []
    healthy_count = 0
    degrading_count = 0

    for s in subsystems:
        alerts_for_sub = [a for a in active_alerts if a.subsystem_id == s.id]
        if s.current_health_index >= 75.0:
            healthy_count += 1
            band = "HEALTHY" if s.current_health_index >= 90.0 else "NORMAL / EARLY DEVIATION"
        else:
            degrading_count += 1
            band = "DEGRADING" if s.current_health_index >= 50.0 else "SIGNIFICANT DEGRADATION"

        subsystems_responses.append(SubsystemResponse(
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
            status_band=band,
            active_alert_count=len(alerts_for_sub),
            trend_direction="DEGRADING" if s.current_health_index < 75.0 else "STABLE"
        ))

    overall_hi = 100.0
    if subsystems:
        overall_hi = round(sum(s.current_health_index for s in subsystems) / len(subsystems), 1)

    sys_status = "HEALTHY"
    if len(criticals) > 0 or overall_hi < 50.0:
        sys_status = "CRITICAL"
    elif len(warnings) > 0 or overall_hi < 75.0:
        sys_status = "DEGRADING"

    # Aggregated 24h health trend
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    recent_records = db.query(HealthIndexRecord).filter(
        HealthIndexRecord.timestamp >= cutoff
    ).order_by(HealthIndexRecord.timestamp.asc()).all()

    # Bucket by timestamp rounded to hour/30-min
    trend_buckets: Dict[str, List[float]] = {}
    for r in recent_records:
        key = r.timestamp.strftime("%H:%M")
        trend_buckets.setdefault(key, []).append(r.health_index)

    health_trend = [
        {"time": k, "health_index": round(sum(v) / len(v), 1)}
        for k, v in trend_buckets.items()
    ]
    if not health_trend:
        now_str = datetime.now(timezone.utc).strftime("%H:%M")
        health_trend = [{"time": now_str, "health_index": overall_hi}]

    # Format recent alerts
    alert_resps = []
    for a in active_alerts[:5]:
        sub = next((s for s in subsystems if s.id == a.subsystem_id), None)
        alert_resps.append(AlertResponse(
            id=a.id,
            subsystem_id=a.subsystem_id,
            subsystem_name=sub.name if sub else a.subsystem_id,
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
            acknowledged_at=a.acknowledged_at,
            resolved_by_id=a.resolved_by_id,
            resolved_at=a.resolved_at,
            notes=a.notes,
            created_at=a.created_at
        ))

    return SystemOverviewResponse(
        overall_health_index=overall_hi,
        system_status=sys_status,
        subsystems_total=len(subsystems),
        subsystems_healthy=healthy_count,
        subsystems_degrading=degrading_count,
        active_warnings=len(warnings),
        active_criticals=len(criticals),
        sensors_active=sensors_count,
        ingestion_rate_hz=10.0,
        data_points_today=len(recent_records) * 6,
        last_telemetry_timestamp=datetime.now(timezone.utc),
        subsystems=subsystems_responses,
        recent_alerts=alert_resps,
        health_index_trend=health_trend
    )

@router.get("/{subsystem_id}/history", response_model=List[HealthIndexHistoryItem])
def get_subsystem_health_history(
    subsystem_id: str,
    limit: int = Query(50, ge=5, le=500),
    db: Session = Depends(get_db)
):
    sub = db.query(Subsystem).filter(
        (Subsystem.id == subsystem_id) | (Subsystem.code == subsystem_id)
    ).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subsystem not found")

    records = db.query(HealthIndexRecord).filter(
        HealthIndexRecord.subsystem_id == sub.id
    ).order_by(HealthIndexRecord.timestamp.asc()).all()

    recent = records[-limit:] if len(records) > limit else records
    return [
        HealthIndexHistoryItem(
            timestamp=r.timestamp,
            health_index=r.health_index,
            status_band=r.status_band
        )
        for r in recent
    ]
