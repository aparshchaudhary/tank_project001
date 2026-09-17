import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, JSON, Index, UniqueConstraint
)
from sqlalchemy.orm import relationship
from app.core.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(64), unique=True, nullable=False, index=True)
    email = Column(String(128), unique=True, nullable=False, index=True)
    hashed_password = Column(String(256), nullable=False)
    full_name = Column(String(128), nullable=False)
    role = Column(String(32), default="VIEWER", nullable=False) # VIEWER, TECHNICIAN, ADMIN
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

class Subsystem(Base):
    __tablename__ = "subsystems"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    code = Column(String(64), unique=True, nullable=False, index=True)
    name = Column(String(128), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(64), nullable=False) # Mechanical, Electrical, Hydraulic, Sensor
    is_active = Column(Boolean, default=True)
    operating_hours = Column(Float, default=0.0)
    operating_cycles = Column(Integer, default=0)
    current_health_index = Column(Float, default=100.0)
    feature_weights = Column(JSON, default=dict) # {"feature_name": weight}
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    sensors = relationship("SensorChannel", back_populates="subsystem", cascade="all, delete-orphan")
    baselines = relationship("BaselineSignature", back_populates="subsystem", cascade="all, delete-orphan")
    health_records = relationship("HealthIndexRecord", back_populates="subsystem", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="subsystem", cascade="all, delete-orphan")
    anomalies = relationship("AnomalyEvent", back_populates="subsystem", cascade="all, delete-orphan")
    maintenance_events = relationship("MaintenanceEvent", back_populates="subsystem", cascade="all, delete-orphan")

class SensorChannel(Base):
    __tablename__ = "sensor_channels"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    subsystem_id = Column(String(36), ForeignKey("subsystems.id"), nullable=False, index=True)
    channel_id = Column(String(64), unique=True, nullable=False, index=True)
    name = Column(String(128), nullable=False)
    sensor_type = Column(String(64), nullable=False) # Vibration, Current, Temperature, Pressure, Flow, Position, Voltage, Environmental
    unit = Column(String(32), nullable=False)
    sampling_rate_hz = Column(Float, default=10.0)
    range_min = Column(Float, nullable=True)
    range_max = Column(Float, nullable=True)
    is_active = Column(Boolean, default=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    subsystem = relationship("Subsystem", back_populates="sensors")
    raw_readings = relationship("RawReading", back_populates="sensor", cascade="all, delete-orphan")

class RawReading(Base):
    __tablename__ = "raw_readings"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    reading_id = Column(String(128), unique=True, nullable=False, index=True) # Deduplication key
    sensor_channel_id = Column(String(36), ForeignKey("sensor_channels.id"), nullable=False, index=True)
    subsystem_id = Column(String(36), ForeignKey("subsystems.id"), nullable=False, index=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    value = Column(Float, nullable=False)
    session_id = Column(String(64), nullable=False, index=True)
    operating_mode = Column(String(32), default="NORMAL")
    schema_version = Column(String(16), default="1.0")
    created_at = Column(DateTime(timezone=True), default=utc_now)

    sensor = relationship("SensorChannel", back_populates="raw_readings")

    __table_args__ = (
        Index("ix_readings_subsystem_timestamp", "subsystem_id", "timestamp"),
        Index("ix_readings_channel_timestamp", "sensor_channel_id", "timestamp"),
    )

class FeatureRecord(Base):
    __tablename__ = "feature_records"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    subsystem_id = Column(String(36), ForeignKey("subsystems.id"), nullable=False, index=True)
    sensor_channel_id = Column(String(36), ForeignKey("sensor_channels.id"), nullable=True, index=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    feature_name = Column(String(64), nullable=False, index=True)
    feature_value = Column(Float, nullable=False)
    window_size_sec = Column(Float, default=1.0)
    session_id = Column(String(64), nullable=False)
    calculation_metadata = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    __table_args__ = (
        Index("ix_feature_subsystem_name_time", "subsystem_id", "feature_name", "timestamp"),
    )

class BaselineSignature(Base):
    __tablename__ = "baseline_signatures"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    subsystem_id = Column(String(36), ForeignKey("subsystems.id"), nullable=False, index=True)
    feature_name = Column(String(64), nullable=False, index=True)
    baseline_mean = Column(Float, nullable=False)
    baseline_stddev = Column(Float, nullable=False)
    sample_count = Column(Integer, nullable=False)
    established_at = Column(DateTime(timezone=True), default=utc_now)
    valid_until = Column(DateTime(timezone=True), nullable=True)
    operating_mode = Column(String(32), default="NORMAL")
    version = Column(String(32), default="v1.0")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    subsystem = relationship("Subsystem", back_populates="baselines")

    __table_args__ = (
        UniqueConstraint("subsystem_id", "feature_name", "version", name="uq_subsystem_feature_version"),
    )

class AnomalyEvent(Base):
    __tablename__ = "anomaly_events"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    subsystem_id = Column(String(36), ForeignKey("subsystems.id"), nullable=False, index=True)
    sensor_channel_id = Column(String(36), ForeignKey("sensor_channels.id"), nullable=True)
    feature_name = Column(String(64), nullable=False)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    severity = Column(String(32), nullable=False) # NORMAL, WARNING, CRITICAL
    anomaly_score = Column(Float, nullable=False)
    deviation_value = Column(Float, nullable=False)
    detection_method = Column(String(64), default="k-sigma statistical deviation")
    model_version = Column(String(32), default="v1.0")
    fault_diagnosis = Column(String(128), default="UNCLASSIFIED ANOMALY")
    raw_context = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    subsystem = relationship("Subsystem", back_populates="anomalies")

class HealthIndexRecord(Base):
    __tablename__ = "health_index_records"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    subsystem_id = Column(String(36), ForeignKey("subsystems.id"), nullable=False, index=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    health_index = Column(Float, nullable=False)
    status_band = Column(String(32), nullable=False) # HEALTHY, EARLY_DEVIATION, DEGRADING, SIGNIFICANT_DEGRADATION, SEVERE
    contributing_features = Column(JSON, default=dict)
    feature_weights = Column(JSON, default=dict)
    formula_version = Column(String(32), default="v1.0")
    created_at = Column(DateTime(timezone=True), default=utc_now)

    subsystem = relationship("Subsystem", back_populates="health_records")

    __table_args__ = (
        Index("ix_health_subsystem_time", "subsystem_id", "timestamp"),
    )

class Alert(Base):
    __tablename__ = "alerts"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    subsystem_id = Column(String(36), ForeignKey("subsystems.id"), nullable=False, index=True)
    sensor_channel_id = Column(String(36), ForeignKey("sensor_channels.id"), nullable=True)
    feature_name = Column(String(64), nullable=False)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    severity = Column(String(32), nullable=False) # WARNING, CRITICAL
    current_value = Column(Float, nullable=False)
    baseline_value = Column(Float, nullable=False)
    health_index_snapshot = Column(Float, nullable=False)
    probable_issue = Column(String(256), nullable=False)
    detection_method = Column(String(64), default="Statistical Threshold Engine")
    status = Column(String(32), default="ACTIVE") # ACTIVE, ACKNOWLEDGED, RESOLVED
    acknowledged_by_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    resolved_by_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    subsystem = relationship("Subsystem", back_populates="alerts")

class MaintenanceEvent(Base):
    __tablename__ = "maintenance_events"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    subsystem_id = Column(String(36), ForeignKey("subsystems.id"), nullable=False, index=True)
    anomaly_id = Column(String(36), ForeignKey("anomaly_events.id"), nullable=True)
    event_type = Column(String(64), nullable=False) # INSPECTION, COMPONENT_REPLACEMENT, LUBRICATION, CALIBRATION, REBASELINE
    description = Column(Text, nullable=False)
    technician_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    operating_hours = Column(Float, default=0.0)
    operating_cycles = Column(Integer, default=0)
    maintenance_priority = Column(String(32), default="MEDIUM") # LOW, MEDIUM, HIGH, IMMEDIATE
    recommendations = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    subsystem = relationship("Subsystem", back_populates="maintenance_events")

class ModelVersion(Base):
    __tablename__ = "model_versions"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    model_name = Column(String(128), nullable=False, index=True)
    version = Column(String(32), nullable=False)
    model_type = Column(String(64), nullable=False) # Statistical Baseline, Isolation Forest, Prognostics Regression
    training_date = Column(DateTime(timezone=True), default=utc_now)
    status = Column(String(32), default="ACTIVE") # ACTIVE, CANDIDATE, RETIRED, ROLLED_BACK
    metrics = Column(JSON, default=dict)
    hyperparameters = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    __table_args__ = (
        UniqueConstraint("model_name", "version", name="uq_model_version"),
    )

class AuditLogEntry(Base):
    __tablename__ = "audit_logs"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    timestamp = Column(DateTime(timezone=True), default=utc_now, index=True)
    user_id = Column(String(36), nullable=True)
    username = Column(String(64), nullable=False)
    role = Column(String(32), nullable=False)
    action = Column(String(64), nullable=False, index=True) # LOGIN, LOGOUT, CONFIG_CHANGE, ACKNOWLEDGE_ALERT, RESOLVE_ALERT, CREATE_MAINTENANCE, CREATE_BASELINE, DEPLOY_MODEL
    entity = Column(String(64), nullable=False) # Subsystem, Alert, MaintenanceEvent, Baseline, User, ModelVersion
    entity_id = Column(String(64), nullable=True)
    description = Column(Text, nullable=False)
    ip_address = Column(String(64), nullable=True)
    session_id = Column(String(64), nullable=True)
