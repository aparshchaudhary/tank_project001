from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.all_models import RawReading, Subsystem, SensorChannel
from app.schemas.schemas import RawReadingCreate, RawReadingResponse, BatchIngestionRequest, BatchIngestionResponse
from app.services.buffer_service import edge_buffer_service

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
