export type UserRole = 'VIEWER' | 'TECHNICIAN' | 'ADMIN';

export interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface Subsystem {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: string;
  is_active: boolean;
  operating_hours: number;
  operating_cycles: number;
  current_health_index: number;
  feature_weights: Record<string, number>;
  status_band?: string;
  active_alert_count?: number;
  trend_direction?: string;
}

export interface SensorChannel {
  id: string;
  subsystem_id: string;
  channel_id: string;
  name: string;
  sensor_type: string;
  unit: string;
  sampling_rate_hz: number;
  range_min?: number;
  range_max?: number;
  is_active: boolean;
  description?: string;
}

export interface BaselineSignature {
  id: string;
  subsystem_id: string;
  feature_name: string;
  baseline_mean: number;
  baseline_stddev: number;
  sample_count: number;
  established_at: string;
  valid_until?: string;
  operating_mode: string;
  version: string;
  is_active: boolean;
}

export interface AnomalyEvent {
  id: string;
  subsystem_id: string;
  sensor_channel_id?: string;
  feature_name: string;
  timestamp: string;
  severity: 'NORMAL' | 'WARNING' | 'CRITICAL';
  anomaly_score: number;
  deviation_value: number;
  detection_method: string;
  model_version: string;
  fault_diagnosis: string;
  raw_context?: Record<string, any>;
}

export interface Alert {
  id: string;
  subsystem_id: string;
  subsystem_name?: string;
  sensor_channel_id?: string;
  feature_name: string;
  timestamp: string;
  severity: 'WARNING' | 'CRITICAL';
  current_value: number;
  baseline_value: number;
  health_index_snapshot: number;
  probable_issue: string;
  detection_method: string;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
  acknowledged_by_id?: string;
  acknowledged_by_name?: string;
  acknowledged_at?: string;
  resolved_by_id?: string;
  resolved_by_name?: string;
  resolved_at?: string;
  notes?: string;
  created_at: string;
}

export interface MaintenanceEvent {
  id: string;
  subsystem_id: string;
  subsystem_name?: string;
  anomaly_id?: string;
  event_type: 'INSPECTION' | 'COMPONENT_REPLACEMENT' | 'LUBRICATION' | 'CALIBRATION' | 'REBASELINE';
  description: string;
  technician_id?: string;
  technician_name?: string;
  operating_hours: number;
  operating_cycles: number;
  maintenance_priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'IMMEDIATE';
  recommendations?: string;
  created_at: string;
}

export interface RulInfo {
  subsystem_id: string;
  status: 'COMPUTED' | 'INSUFFICIENT_DATA' | 'HEALTHY_STABLE';
  rul_hours: number | null;
  confidence_score: number | null;
  degradation_rate_per_hour: number | null;
  samples_analyzed: number;
  message: string;
  prognostics_model_version: string;
  calculated_at: string;
}

export interface HealthIndexHistoryItem {
  timestamp: string;
  health_index: number;
  status_band?: string;
}

export interface SubsystemDetail extends Subsystem {
  sensors: SensorChannel[];
  active_baselines: BaselineSignature[];
  recent_anomalies: AnomalyEvent[];
  rul_info?: RulInfo;
}

export interface ModelVersion {
  id: string;
  model_name: string;
  version: string;
  model_type: string;
  training_date: string;
  status: 'ACTIVE' | 'CANDIDATE' | 'RETIRED' | 'ROLLED_BACK';
  metrics: Record<string, any>;
  hyperparameters: Record<string, any>;
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user_id?: string;
  username: string;
  role: string;
  action: string;
  entity: string;
  entity_id?: string;
  description: string;
  ip_address?: string;
}

export interface SimulatorStatus {
  is_running: boolean;
  scenario: string;
  speed_multiplier: number;
  fault_severity: number;
  noise_level: number;
  operating_mode: string;
  active_subsystems: string[];
  readings_generated_count: number;
  uptime_seconds: number;
  demo_mode_active: boolean;
  demo_mode_step?: string;
}

export interface SystemOverview {
  overall_health_index: number;
  system_status: 'HEALTHY' | 'DEGRADING' | 'CRITICAL';
  subsystems_total: number;
  subsystems_healthy: number;
  subsystems_degrading: number;
  active_warnings: number;
  active_criticals: number;
  sensors_active: number;
  ingestion_rate_hz: number;
  data_points_today: number;
  last_telemetry_timestamp?: string;
  subsystems: Subsystem[];
  recent_alerts: Alert[];
  health_index_trend: { time: string; health_index: number }[];
}
