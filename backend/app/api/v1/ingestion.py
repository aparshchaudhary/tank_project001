from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.all_models import RawReading, Subsystem, SensorChannel, BaselineSignature
from app.schemas.schemas import RawReadingCreate, RawReadingResponse, BatchIngestionRequest, BatchIngestionResponse
from app.services.buffer_service import edge_buffer_service
from app.services.anomaly_detector import anomaly_detector
from app.services.alert_service import alert_service
from app.services.health_index_engine import health_index_engine
from app.services.telemetry_cache import telemetry_cache
from app.simulator.runner import simulator_runner

router = APIRouter()

@router.post("/readings", response_model=RawReadingResponse, status_code=status.HTTP_201_CREATED)
def ingest_single_reading(
    payload: RawReadingCreate,
    db: Session = Depends(get_db)
):
    # Validate subsystem exists
    subsystem = db.query(Subsystem).filter(Subsystem.id == payload.subsystem_id).first()
    if not subsystem:
        # Fallback check by code
        subsystem = db.query(Subsystem).filter(Subsystem.code == payload.subsystem_id).first()
        if not subsystem:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Subsystem {payload.subsystem_id} not found"
            )

    # Validate channel exists
    channel = db.query(SensorChannel).filter(SensorChannel.id == payload.sensor_channel_id).first()
    if not channel:
        channel = db.query(SensorChannel).filter(SensorChannel.channel_id == payload.sensor_channel_id).first()
        if not channel:
            # Create channel on-the-fly for resilience if not found
            channel = SensorChannel(
                subsystem_id=subsystem.id,
                channel_id=payload.sensor_channel_id,
                name=payload.sensor_type or "Dynamic Channel",
                sensor_type=payload.sensor_type or "Generic",
                unit=payload.unit or "raw"
            )
            db.add(channel)
            db.flush()

    # Deduplication & out-of-order check
    is_dup, is_ooo, message = edge_buffer_service.check_reading_resilience(
        payload.reading_id,
        payload.timestamp
    )
    if is_dup:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=message
        )

    reading = RawReading(
        reading_id=payload.reading_id,
        sensor_channel_id=channel.id,
        subsystem_id=subsystem.id,
        timestamp=payload.timestamp,
        value=payload.value,
        session_id=payload.session_id,
        operating_mode=payload.operating_mode,
        schema_version=payload.schema_version
    )
    db.add(reading)
    db.commit()
    db.refresh(reading)

    sub_key = subsystem.code
    feat_name = payload.sensor_type or payload.sensor_channel_id.replace(f"CH_{sub_key}_", "").lower()
    telemetry_cache.update_features(sub_key, {feat_name: payload.value})

    try:
        simulator_runner.broadcast_telemetry({
            "type": "TELEMETRY_UPDATE",
            "batch": [{
                "subsystem_id": subsystem.id,
                "subsystem_code": subsystem.code,
                "subsystem_name": subsystem.name,
                "health_index": subsystem.current_health_index,
                "status_band": "HEALTHY",
                "features": telemetry_cache.get_features(subsystem.code),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }],
            "simulator_status": simulator_runner.get_status()
        })
    except Exception:
        pass

    return reading

@router.post("/batch", response_model=BatchIngestionResponse)
def ingest_batch_readings(
    payload: BatchIngestionRequest,
    db: Session = Depends(get_db)
):
    received = len(payload.readings)
    accepted = 0
    duplicates = 0
    out_of_order = 0
    errors: List[str] = []

    for r in payload.readings:
        try:
            # Check resilience
            is_dup, is_ooo, msg = edge_buffer_service.check_reading_resilience(r.reading_id, r.timestamp)
            if is_dup:
                duplicates += 1
                continue
            if is_ooo:
                out_of_order += 1

            # Subsystem lookup
            subsystem = db.query(Subsystem).filter(
                (Subsystem.id == r.subsystem_id) | (Subsystem.code == r.subsystem_id)
            ).first()
            if not subsystem:
                errors.append(f"Subsystem {r.subsystem_id} not recognized")
                continue

            # Sensor channel lookup
            channel = db.query(SensorChannel).filter(
                (SensorChannel.id == r.sensor_channel_id) | (SensorChannel.channel_id == r.sensor_channel_id)
            ).first()
            if not channel:
                channel = SensorChannel(
                    subsystem_id=subsystem.id,
                    channel_id=r.sensor_channel_id,
                    name=r.sensor_type or "Dynamic Channel",
                    sensor_type=r.sensor_type or "Generic",
                    unit=r.unit or "raw"
                )
                db.add(channel)
                db.flush()

            reading = RawReading(
                reading_id=r.reading_id,
                sensor_channel_id=channel.id,
                subsystem_id=subsystem.id,
                timestamp=r.timestamp,
                value=r.value,
                session_id=r.session_id,
                operating_mode=r.operating_mode,
                schema_version=r.schema_version
            )
            db.add(reading)
            accepted += 1
        except Exception as ex:
            errors.append(f"Error processing reading {r.reading_id}: {str(ex)}")

    db.commit()

    # Process health evaluation and live broadcast for all updated subsystems
    telemetry_batch = []
    try:
        subsystems_updated: dict = {}
        for r in payload.readings:
            sub_key = str(r.subsystem_id).upper()
            feat_name = r.sensor_type or r.sensor_channel_id.replace(f"CH_{sub_key}_", "").lower()
            if sub_key not in subsystems_updated:
                subsystems_updated[sub_key] = {}
            subsystems_updated[sub_key][feat_name] = r.value

        for sub_key, features in subsystems_updated.items():
            telemetry_cache.update_features(sub_key, features)
            sub = db.query(Subsystem).filter(
                (Subsystem.code == sub_key) | (Subsystem.id == sub_key)
            ).first()
            if not sub:
                continue

            active_baselines = {
                b.feature_name: b for b in db.query(BaselineSignature).filter(
                    BaselineSignature.subsystem_id == sub.id,
                    BaselineSignature.is_active == True
                ).all()
            }

            for feat_name, val in features.items():
                base_sig = active_baselines.get(feat_name)
                if base_sig:
                    anomaly = anomaly_detector.evaluate_feature(
                        subsystem_id=sub.id,
                        subsystem_code=sub.code,
                        feature_name=feat_name,
                        current_value=val,
                        baseline=base_sig,
                        all_features=features
                    )
                    if anomaly:
                        db.add(anomaly)
                        alert_service.trigger_or_update_alert(
                            db=db,
                            subsystem_id=sub.id,
                            feature_name=feat_name,
                            severity=anomaly.severity,
                            current_value=val,
                            baseline_value=base_sig.baseline_mean,
                            health_index_snapshot=sub.current_health_index,
                            probable_issue=anomaly.fault_diagnosis
                        )

            if active_baselines:
                hi_record = health_index_engine.record_health_index(
                    db=db,
                    subsystem=sub,
                    current_features=features,
                    baselines=active_baselines
                )
                telemetry_batch.append({
                    "subsystem_id": sub.id,
                    "subsystem_code": sub.code,
                    "subsystem_name": sub.name,
                    "health_index": hi_record.health_index,
                    "status_band": hi_record.status_band,
                    "features": telemetry_cache.get_features(sub.code),
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })

        db.commit()

        if telemetry_batch:
            simulator_runner.broadcast_telemetry({
                "type": "TELEMETRY_UPDATE",
                "batch": telemetry_batch,
                "simulator_status": simulator_runner.get_status()
            })
    except Exception as ex:
        # Resilience safeguard: broadcast errors should never crash ingestion response
        errors.append(f"Live broadcast warning: {str(ex)}")

    return {
        "received_count": received,
        "accepted_count": accepted,
        "duplicate_count": duplicates,
        "out_of_order_count": out_of_order,
        "validation_error_count": len(errors),
        "errors": errors[:10],
        "status": "COMPLETED" if len(errors) == 0 else "PARTIAL_SUCCESS"
    }

@router.get("/buffer-status")
def get_edge_buffer_status():
    return edge_buffer_service.get_buffer_stats()
