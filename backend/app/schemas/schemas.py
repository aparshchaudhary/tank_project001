from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

# --- AUTH & USER ---
class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    username: str
    full_name: str

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None
    exp: Optional[int] = None

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    full_name: str
    role: str = "VIEWER"

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    username: str
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime

# --- INGESTION & READINGS ---
class RawReadingCreate(BaseModel):
    reading_id: str = Field(..., description="Unique reading ID for deduplication")
    sensor_channel_id: str
    subsystem_id: str
    timestamp: datetime
    value: float
    session_id: str = "SESSION_DEFAULT"
    operating_mode: str = "NORMAL"
    schema_version: str = "1.0"
    unit: Optional[str] = None
    sensor_type: Optional[str] = None

class RawReadingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    reading_id: str
    sensor_channel_id: str
    subsystem_id: str
    timestamp: datetime
    value: float
    session_id: str
    operating_mode: str
    schema_version: str
    created_at: datetime

class BatchIngestionRequest(BaseModel):
    readings: List[RawReadingCreate]
    batch_id: Optional[str] = None
    source: Optional[str] = "SYNTHETIC_SIMULATOR"

class BatchIngestionResponse(BaseModel):
    received_count: int
    accepted_count: int
    duplicate_count: int
    out_of_order_count: int
    validation_error_count: int
    errors: List[str] = []
    status: str = "PROCESSED"

# --- FEATURES ---
class FeatureRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    subsystem_id: str
    sensor_channel_id: Optional[str] = None
    timestamp: datetime
    feature_name: str
    feature_value: float
    window_size_sec: float
    session_id: str
    calculation_metadata: Dict[str, Any]

# --- BASELINES ---
class BaselineSignatureResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    subsystem_id: str
    feature_name: str
    baseline_mean: float
    baseline_stddev: float
    sample_count: int
    established_at: datetime
    valid_until: Optional[datetime] = None
    operating_mode: str
    version: str
    is_active: bool

class RebaselineRequest(BaseModel):
    subsystem_id: str
    sample_duration_seconds: int = 60
    operating_mode: str = "NORMAL"
    reason: str = "Scheduled post-maintenance rebaselining"

# --- ANOMALY ---
class AnomalyEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    subsystem_id: str
    sensor_channel_id: Optional[str] = None
    feature_name: str
    timestamp: datetime
    severity: str
    anomaly_score: float
    deviation_value: float
    detection_method: str
    model_version: str
    fault_diagnosis: str
    raw_context: Dict[str, Any]

# --- HEALTH INDEX ---
class HealthIndexResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    subsystem_id: str
    subsystem_name: Optional[str] = None
    timestamp: datetime
    health_index: float
    status_band: str
    contributing_features: Dict[str, Any]
    feature_weights: Dict[str, Any]
    formula_version: str

class HealthIndexHistoryItem(BaseModel):
    timestamp: datetime
    health_index: float
    status_band: str

# --- PROGNOSTICS / RUL ---
class RulResponse(BaseModel):
    subsystem_id: str
    status: str # "COMPUTED" or "INSUFFICIENT_DATA"
    rul_hours: Optional[float] = None
    confidence_score: Optional[float] = None
    degradation_rate_per_hour: Optional[float] = None
    samples_analyzed: int
    message: str
    prognostics_model_version: str = "RUL-Reg-v1.0"
    calculated_at: datetime

# --- ALERTS ---
class AlertResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    subsystem_id: str
    subsystem_name: Optional[str] = None
    sensor_channel_id: Optional[str] = None
    feature_name: str
    timestamp: datetime
    severity: str
    current_value: float
    baseline_value: float
    health_index_snapshot: float
    probable_issue: str
    detection_method: str
    status: str
    acknowledged_by_id: Optional[str] = None
    acknowledged_by_name: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    resolved_by_id: Optional[str] = None
    resolved_by_name: Optional[str] = None
    resolved_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime

class AlertAcknowledgeRequest(BaseModel):
    notes: Optional[str] = None

class AlertResolveRequest(BaseModel):
    resolution_notes: str

# --- MAINTENANCE ---
class MaintenanceEventCreate(BaseModel):
    subsystem_id: str
    anomaly_id: Optional[str] = None
    event_type: str # INSPECTION, COMPONENT_REPLACEMENT, LUBRICATION, CALIBRATION, REBASELINE
    description: str
    operating_hours: Optional[float] = 0.0
    operating_cycles: Optional[int] = 0
    maintenance_priority: str = "MEDIUM"
    recommendations: Optional[str] = None

class MaintenanceEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    subsystem_id: str
    subsystem_name: Optional[str] = None
    anomaly_id: Optional[str] = None
    event_type: str
    description: str
    technician_id: Optional[str] = None
    technician_name: Optional[str] = None
    operating_hours: float
    operating_cycles: int
    maintenance_priority: str
    recommendations: Optional[str] = None
    created_at: datetime

# --- SUBSYSTEMS & SENSORS ---
class SensorChannelResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    subsystem_id: str
    channel_id: str
    name: str
    sensor_type: str
    unit: str
    sampling_rate_hz: float
    range_min: Optional[float] = None
    range_max: Optional[float] = None
    is_active: bool
    description: Optional[str] = None

class SubsystemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    code: str
    name: str
    description: Optional[str] = None
    category: str
    is_active: bool
    operating_hours: float
    operating_cycles: int
    current_health_index: float
    feature_weights: Dict[str, float]
    status_band: Optional[str] = "HEALTHY"
    active_alert_count: Optional[int] = 0
    trend_direction: Optional[str] = "STABLE"

class SubsystemDetailResponse(SubsystemResponse):
    sensors: List[SensorChannelResponse] = []
    active_baselines: List[BaselineSignatureResponse] = []
    recent_anomalies: List[AnomalyEventResponse] = []
    rul_info: Optional[RulResponse] = None

class FeatureWeightUpdate(BaseModel):
    feature_weights: Dict[str, float]

# --- SIMULATOR ---
class SimulatorStatusResponse(BaseModel):
    is_running: bool
    scenario: str
    speed_multiplier: float
    fault_severity: float
    noise_level: float
    operating_mode: str
    active_subsystems: List[str]
    readings_generated_count: int
    uptime_seconds: float
    demo_mode_active: bool
    demo_mode_step: Optional[str] = None

class SimulatorControlRequest(BaseModel):
    action: str # START, STOP, RESTART, SET_SCENARIO
    scenario: Optional[str] = "HEALTHY"
    speed_multiplier: Optional[float] = 1.0
    fault_severity: Optional[float] = 0.0 # 0.0 to 1.0
    noise_level: Optional[float] = 0.05
    operating_mode: Optional[str] = "NORMAL"
    selected_subsystem: Optional[str] = None # specific or "ALL"

# --- MODEL REGISTRY ---
class ModelVersionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    model_name: str
    version: str
    model_type: str
    training_date: datetime
    status: str
    metrics: Dict[str, Any]
    hyperparameters: Dict[str, Any]
    created_at: datetime

# --- AUDIT ---
class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    timestamp: datetime
    user_id: Optional[str] = None
    username: str
    role: str
    action: str
    entity: str
    entity_id: Optional[str] = None
    description: str
    ip_address: Optional[str] = None

# --- SYSTEM OVERVIEW ---
class SystemOverviewResponse(BaseModel):
    overall_health_index: float
    system_status: str # HEALTHY, DEGRADING, CRITICAL
    subsystems_total: int
    subsystems_healthy: int
    subsystems_degrading: int
    active_warnings: int
    active_criticals: int
    sensors_active: int
    ingestion_rate_hz: float
    data_points_today: int
    last_telemetry_timestamp: Optional[datetime] = None
    subsystems: List[SubsystemResponse]
    recent_alerts: List[AlertResponse]
    health_index_trend: List[Dict[str, Any]]
