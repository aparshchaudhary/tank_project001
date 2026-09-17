from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.all_models import Alert, Subsystem, User, AuditLogEntry

class AlertService:
    @staticmethod
    def trigger_or_update_alert(
        db: Session,
        subsystem_id: str,
        feature_name: str,
        severity: str,
        current_value: float,
        baseline_value: float,
        health_index_snapshot: float,
        probable_issue: str,
        detection_method: str = "Statistical Threshold Engine",
        sensor_channel_id: Optional[str] = None
    ) -> Alert:
        now = datetime.now(timezone.utc)
        
        # Check for existing active or acknowledged alert on this subsystem & feature
        existing = db.query(Alert).filter(
            Alert.subsystem_id == subsystem_id,
            Alert.feature_name == feature_name,
            Alert.status.in_(["ACTIVE", "ACKNOWLEDGED"])
        ).first()

        if existing:
            # Update latest reading snapshot
            existing.current_value = current_value
            existing.health_index_snapshot = health_index_snapshot
            if severity == "CRITICAL" and existing.severity == "WARNING":
                existing.severity = "CRITICAL"
                existing.probable_issue = probable_issue
            db.commit()
            db.refresh(existing)
            return existing

        # Create new alert
        alert = Alert(
            subsystem_id=subsystem_id,
            sensor_channel_id=sensor_channel_id,
            feature_name=feature_name,
            timestamp=now,
            severity=severity,
            current_value=current_value,
            baseline_value=baseline_value,
            health_index_snapshot=health_index_snapshot,
            probable_issue=probable_issue,
            detection_method=detection_method,
            status="ACTIVE"
        )
        db.add(alert)
        db.commit()
        db.refresh(alert)
        return alert

    @staticmethod
    def acknowledge_alert(
        db: Session,
        alert_id: str,
        user: User,
        notes: Optional[str] = None
    ) -> Alert:
        alert = db.query(Alert).filter(Alert.id == alert_id).first()
        if not alert:
            raise ValueError("Alert not found")
        
        now = datetime.now(timezone.utc)
        alert.status = "ACKNOWLEDGED"
        alert.acknowledged_by_id = user.id
        alert.acknowledged_at = now
        if notes:
            alert.notes = f"{alert.notes or ''}\n[Ack by {user.username}]: {notes}".strip()

        # Audit log
        audit = AuditLogEntry(
            user_id=user.id,
            username=user.username,
            role=user.role,
            action="ACKNOWLEDGE_ALERT",
            entity="Alert",
            entity_id=alert_id,
            description=f"Alert for {alert.feature_name} acknowledged by {user.username}"
        )
        db.add(audit)
        db.commit()
        db.refresh(alert)
        return alert

    @staticmethod
    def resolve_alert(
        db: Session,
        alert_id: str,
        user: User,
        resolution_notes: str
    ) -> Alert:
        alert = db.query(Alert).filter(Alert.id == alert_id).first()
        if not alert:
            raise ValueError("Alert not found")
        
        now = datetime.now(timezone.utc)
        alert.status = "RESOLVED"
        alert.resolved_by_id = user.id
        alert.resolved_at = now
        alert.notes = f"{alert.notes or ''}\n[Resolved by {user.username}]: {resolution_notes}".strip()

        # Audit log
        audit = AuditLogEntry(
            user_id=user.id,
            username=user.username,
            role=user.role,
            action="RESOLVE_ALERT",
            entity="Alert",
            entity_id=alert_id,
            description=f"Alert for {alert.feature_name} resolved by {user.username}. Notes: {resolution_notes}"
        )
        db.add(audit)
        db.commit()
        db.refresh(alert)
        return alert

alert_service = AlertService()
