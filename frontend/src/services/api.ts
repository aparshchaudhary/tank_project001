import {
  User, Subsystem, SubsystemDetail, Alert, AnomalyEvent,
  MaintenanceEvent, RulInfo, ModelVersion, AuditLogEntry,
  SimulatorStatus, SystemOverview, SensorChannel
} from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || '';
const API_V1 = `${BASE_URL}/api/v1`;

class ApiService {
  private getToken(): string | null {
    return localStorage.getItem('cbpm_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_V1}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Network request failed' }));
      throw new Error(errorData.detail || `Request failed with status ${response.status}`);
    }

    return response.json();
  }

  // AUTH
  async login(username: string, password: string):Promise<{ access_token: string; role: string; username: string; full_name: string }> {
    return this.request('/auth/login-json', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  async getMe(): Promise<User> {
    return this.request('/auth/me');
  }

  // HEALTH & OVERVIEW
  async getOverview(): Promise<SystemOverview> {
    return this.request('/health/overview');
  }

  async getHealthHistory(subsystemId: string, limit: number = 50): Promise<{ timestamp: string; health_index: number; status_band: string }[]> {
    return this.request(`/health/${subsystemId}/history?limit=${limit}`);
  }

  // SUBSYSTEMS & SENSORS
  async getSubsystems(): Promise<Subsystem[]> {
    return this.request('/subsystems/');
  }

  async getSubsystemDetail(id: string): Promise<SubsystemDetail> {
    return this.request(`/subsystems/${id}`);
  }

  async updateFeatureWeights(id: string, feature_weights: Record<string, number>): Promise<Subsystem> {
    return this.request(`/subsystems/${id}/weights`, {
      method: 'PUT',
      body: JSON.stringify({ feature_weights }),
    });
  }

  async getSensors(): Promise<SensorChannel[]> {
    return this.request('/sensors/');
  }

  // ALERTS
  async getAlerts(params?: { subsystem_id?: string; severity?: string; status?: string }): Promise<Alert[]> {
    const query = new URLSearchParams();
    if (params?.subsystem_id) query.append('subsystem_id', params.subsystem_id);
    if (params?.severity) query.append('severity', params.severity);
    if (params?.status) query.append('status', params.status);
    return this.request(`/alerts/?${query.toString()}`);
  }

  async acknowledgeAlert(id: string, notes?: string): Promise<Alert> {
    return this.request(`/alerts/${id}/acknowledge`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  }

  async resolveAlert(id: string, resolution_notes: string): Promise<Alert> {
    return this.request(`/alerts/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ resolution_notes }),
    });
  }

  // ANOMALIES
  async getAnomalies(subsystemId?: string, limit: number = 50): Promise<AnomalyEvent[]> {
    const query = new URLSearchParams();
    if (subsystemId) query.append('subsystem_id', subsystemId);
    query.append('limit', limit.toString());
    return this.request(`/anomalies/?${query.toString()}`);
  }

  // MAINTENANCE
  async getMaintenanceEvents(subsystemId?: string): Promise<MaintenanceEvent[]> {
    const query = subsystemId ? `?subsystem_id=${subsystemId}` : '';
    return this.request(`/maintenance/events${query}`);
  }

  async createMaintenanceEvent(data: {
    subsystem_id: string;
    event_type: string;
    description: string;
    anomaly_id?: string;
    operating_hours?: number;
    operating_cycles?: number;
    maintenance_priority: string;
    recommendations?: string;
  }): Promise<MaintenanceEvent> {
    return this.request('/maintenance/events', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // PROGNOSTICS / RUL
  async getRul(subsystemId: string): Promise<RulInfo> {
    return this.request(`/prognostics/${subsystemId}/rul`);
  }

  // REPORTS
  async getReportTypes(): Promise<{ key: string; title: string; default_days: number }[]> {
    return this.request('/reports/types');
  }

  async generateReport(reportType: string, format: 'json' | 'html' = 'json', days?: number): Promise<any> {
    const query = new URLSearchParams({ report_type: reportType, format });
    if (days) query.append('days', days.toString());
    
    if (format === 'html') {
      const response = await fetch(`${API_V1}/reports/generate?${query.toString()}`, {
        headers: this.getToken() ? { Authorization: `Bearer ${this.getToken()}` } : {},
      });
      return response.text();
    }
    return this.request(`/reports/generate?${query.toString()}`);
  }

  getPdfReportUrl(reportType: string, days?: number): string {
    const query = new URLSearchParams({ report_type: reportType });
    if (days) query.append('days', days.toString());
    return `${API_V1}/reports/download-pdf?${query.toString()}`;
  }

  // SIMULATOR
  async getSimulatorStatus(): Promise<SimulatorStatus> {
    return this.request('/simulator/status');
  }

  async getSimulatorScenarios(): Promise<string[]> {
    return this.request('/simulator/scenarios');
  }

  async controlSimulator(data: {
    action: 'START' | 'STOP' | 'SET_SCENARIO';
    scenario?: string;
    speed_multiplier?: number;
    fault_severity?: number;
    noise_level?: number;
    operating_mode?: string;
  }): Promise<SimulatorStatus> {
    return this.request('/simulator/control', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async triggerDemoMode(): Promise<SimulatorStatus> {
    return this.request('/simulator/demo-mode', { method: 'POST' });
  }

  // MODELS & REGISTRY
  async getModels(): Promise<ModelVersion[]> {
    return this.request('/models/');
  }

  async rollbackModel(modelId: string): Promise<ModelVersion> {
    return this.request(`/models/${modelId}/rollback`, { method: 'POST' });
  }

  // ADMIN
  async getUsers(): Promise<User[]> {
    return this.request('/admin/users');
  }

  async createUser(data: any): Promise<User> {
    return this.request('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async rebaseline(subsystemId: string, reason?: string): Promise<any> {
    return this.request('/admin/rebaseline', {
      method: 'POST',
      body: JSON.stringify({ subsystem_id: subsystemId, reason }),
    });
  }

  async getSystemConfig(): Promise<any> {
    return this.request('/admin/system-config');
  }

  // AUDIT LOGS
  async getAuditLogs(params?: { action?: string; entity?: string; username?: string }): Promise<AuditLogEntry[]> {
    const query = new URLSearchParams();
    if (params?.action) query.append('action', params.action);
    if (params?.entity) query.append('entity', params.entity);
    if (params?.username) query.append('username', params.username);
    return this.request(`/audit/?${query.toString()}`);
  }
}

export const api = new ApiService();
