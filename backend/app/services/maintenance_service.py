from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.all_models import MaintenanceEvent, Subsystem, User, AuditLogEntry

class MaintenanceService:
    VALID_EVENT_TYPES = ["INSPECTION", "COMPONENT_REPLACEMENT", "LUBRICATION", "CALIBRATION", "REBASELINE"]
    VALID_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "IMMEDIATE"]

    @staticmethod
    def create_maintenance_event(
        db: Session,
        subsystem_id: str,
        user: User,
        event_type: str,
        description: str,
        anomaly_id: Optional[str] = None,
        operating_hours: Optional[float] = 0.0,
        operating_cycles: Optional[int] = 0,
        maintenance_priority: str = "MEDIUM",
        recommendations: Optional[str] = None
    ) -> MaintenanceEvent:
        subsystem = db.query(Subsystem).filter(Subsystem.id == subsystem_id).first()
        if not subsystem:
            raise ValueError("Subsystem not found")

        # Generate standard maintenance/inspection recommendations if not provided
        if not recommendations:
            if maintenance_priority == "IMMEDIATE":
                recommendations = "Perform immediate physical inspection of monitored subsystem. Review recent telemetry degradation curve."
            elif maintenance_priority == "HIGH":
                recommendations = "Schedule authorized maintenance inspection within 24 operational hours. Increase monitoring frequency."
            else:
                recommendations = "Routine condition check. Log baseline metrics and verify lubrication."

        event = MaintenanceEvent(
            subsystem_id=subsystem_id,
            anomaly_id=anomaly_id,
            event_type=event_type,
            description=description,
            technician_id=user.id,
            operating_hours=operating_hours or subsystem.operating_hours,
            operating_cycles=operating_cycles or subsystem.operating_cycles,
            maintenance_priority=maintenance_priority,
            recommendations=recommendations,
            created_at=datetime.now(timezone.utc)
        )
        db.add(event)
        
        # Log to audit trail
        audit = AuditLogEntry(
            user_id=user.id,
            username=user.username,
            role=user.role,
            action="CREATE_MAINTENANCE",
            entity="MaintenanceEvent",
            entity_id=event.id,
            description=f"Maintenance logged ({event_type}) for {subsystem.name} by {user.username}"
        )
        db.add(audit)
        db.commit()
        db.refresh(event)
        return event

maintenance_service = MaintenanceService()
