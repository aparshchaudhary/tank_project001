from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.all_models import SensorChannel
from app.schemas.schemas import SensorChannelResponse

router = APIRouter()

@router.get("/", response_model=List[SensorChannelResponse])
def get_all_sensors(db: Session = Depends(get_db)):
    return db.query(SensorChannel).all()

@router.get("/{sensor_id}", response_model=SensorChannelResponse)
def get_sensor(sensor_id: str, db: Session = Depends(get_db)):
    sensor = db.query(SensorChannel).filter(
        (SensorChannel.id == sensor_id) | (SensorChannel.channel_id == sensor_id)
    ).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor channel not found")
    return sensor
