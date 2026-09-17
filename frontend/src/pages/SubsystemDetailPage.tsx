import React, { useState, useEffect } from 'react';
import { SubsystemDetail, HealthIndexHistoryItem, MaintenanceEvent } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/common/StatusBadge';
import {
  ArrowLeft,
  Activity,
  Cpu,
  Shield,
  Clock,
  RotateCcw,
  Wrench,
  Download,
  Sliders,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface SubsystemDetailPageProps {
  subsystemId: string;
  onBack: () => void;
  onOpenMaintenanceModal: (subsystemId: string) => void;
}

export const SubsystemDetailPage: React.FC<SubsystemDetailPageProps> = ({
  subsystemId,
  onBack,
  onOpenMaintenanceModal,
}) => {
  const { role } = useAuth();
  const [detail, setDetail] = useState<SubsystemDetail | null>(null);
  const [history, setHistory] = useState<HealthIndexHistoryItem[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'TELEMETRY' | 'BASELINES' | 'ANOMALIES' | 'MAINTENANCE' | 'WEIGHTS'>('TELEMETRY');
  const [featureWeights, setFeatureWeights] = useState<Record<string, number>>({});
  const [weightsSaving, setWeightsSaving] = useState(false);

  const fetchData = async () => {
    try {
      const [subData, histData, maintData] = await Promise.all([
        api.getSubsystemDetail(subsystemId),
        api.getHealthHistory(subsystemId, 40),
        api.getMaintenanceEvents(subsystemId),
      ]);
      setDetail(subData);
      setHistory(histData);
      setMaintenance(maintData);
      setFeatureWeights(subData.feature_weights || {});
    } catch (e) {
      console.error('Failed to load subsystem detail', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, [subsystemId]);

  const handleSaveWeights = async () => {
    setWeightsSaving(true);
    try {
      await api.updateFeatureWeights(subsystemId, featureWeights);
      await fetchData();
    } catch (e) {
      alert('Failed to update weights: ' + e);
    } finally {
      setWeightsSaving(false);
    }
  };

  const handleRebaseline = async () => {
    if (!confirm('Re-baseline this subsystem using current nominal telemetry? This action will be audited.')) return;
    try {
      await api.rebaseline(subsystemId, 'Technician requested scheduled rebaselining');
      await fetchData();
      alert('Re-baselining completed successfully.');
    } catch (e) {
      alert('Rebaselining failed: ' + e);
    }
  };

  const handleExportData = () => {
    if (!detail) return;
    const jsonStr = JSON.stringify(detail, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `turret_${detail.code}_telemetry_export.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading || !detail) {
    return (
      <div className="flex items-center justify-center h-96 font-mono text-cyan-400">
        LOADING SUBSYSTEM TELEMETRY DETAILS...
      </div>
    );
  }

  const chartData = history.map((h) => ({
    time: new Date(h.timestamp).toLocaleTimeString(),
    health_index: h.health_index,
  }));

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-wrap items-center justify-between gap-4 font-mono">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded bg-defense-900 border border-defense-700 hover:bg-defense-800 text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-widest">
              {detail.category} &bull; CODE: {detail.code}
            </div>
            <h1 className="text-lg font-bold text-slate-100">{detail.name}</h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 text-xs">
          <button
            onClick={handleExportData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-defense-900 border border-defense-700 hover:bg-defense-800 text-slate-300"
          >
            <Download className="w-3.5 h-3.5" />
            Export JSON
          </button>

          {role === 'ADMIN' && (
            <button
              onClick={handleRebaseline}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-cyan-950/80 border border-cyan-700 text-cyan-300 hover:bg-cyan-900"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Re-Baseline
            </button>
          )}

          {(role === 'TECHNICIAN' || role === 'ADMIN') && (
            <button
              onClick={() => onOpenMaintenanceModal(detail.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30"
            >
              <Wrench className="w-3.5 h-3.5" />
              Log Work Order
            </button>
          )}
        </div>
      </div>

      {/* Subsystem Health KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono">
        {/* Health Index */}
        <div className="bg-defense-900 border border-defense-700/80 rounded-lg p-4">
          <div className="text-[11px] text-slate-400 uppercase">Health Index</div>
          <div className="flex items-baseline justify-between mt-2">
            <span className={`text-4xl font-bold ${
              detail.current_health_index >= 75 ? 'text-emerald-400' : detail.current_health_index >= 50 ? 'text-amber-400' : 'text-red-400'
            }`}>
              {detail.current_health_index.toFixed(1)}%
            </span>
            <StatusBadge status={detail.status_band || 'HEALTHY'} size="sm" />
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            Formula: HI-WeightedDev-v1.0
          </div>
        </div>

        {/* Operating Hours & Cycles */}
        <div className="bg-defense-900 border border-defense-700/80 rounded-lg p-4">
          <div className="text-[11px] text-slate-400 uppercase">Service Meter</div>
          <div className="mt-2 text-2xl font-bold text-slate-100">
            {detail.operating_hours.toFixed(1)} <span className="text-xs text-slate-400 font-normal">hrs</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            Operating Cycles: <span className="text-slate-200">{detail.operating_cycles.toLocaleString()}</span>
          </div>
        </div>

        {/* RUL Prognosis */}
        <div className="bg-defense-900 border border-defense-700/80 rounded-lg p-4">
          <div className="text-[11px] text-slate-400 uppercase flex items-center justify-between">
            <span>RUL Prognosis</span>
            <span className="text-[9px] bg-defense-800 text-slate-400 px-1 rounded">OPTIONAL</span>
          </div>
          <div className="mt-2 text-xl font-bold text-cyan-300 truncate">
            {detail.rul_info?.status === 'COMPUTED' ? (
              <span>{detail.rul_info.rul_hours} hrs</span>
            ) : detail.rul_info?.status === 'HEALTHY_STABLE' ? (
              <span className="text-emerald-400 text-base">NOMINAL / STABLE</span>
            ) : (
              <span className="text-amber-400 text-sm">INSUFFICIENT DATA</span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 mt-2 truncate" title={detail.rul_info?.message}>
            {detail.rul_info?.message || 'Prognostic trend evaluation'}
          </div>
        </div>

        {/* Monitored Channels */}
        <div className="bg-defense-900 border border-defense-700/80 rounded-lg p-4">
          <div className="text-[11px] text-slate-400 uppercase">Sensors / Channels</div>
          <div className="mt-2 text-2xl font-bold text-slate-100">
            {detail.sensors.length} <span className="text-xs text-slate-400 font-normal">active</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            Baselines Established: <span className="text-emerald-400 font-semibold">{detail.active_baselines.length}</span>
          </div>
        </div>
      </div>

      {/* Health Trend Timeline Chart */}
      <div className="bg-defense-900 border border-defense-700/80 rounded-lg p-4 font-mono">
        <div className="flex items-center justify-between mb-3 text-xs">
          <span className="font-bold text-slate-100 tracking-wider uppercase flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            HISTORICAL HEALTH TRAJECTORY DEGRADATION CURVE
          </span>
          <span className="text-slate-400 text-[11px]">Last 40 Telemetry Observations</span>
        </div>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="subHealthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#00f0ff" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2b45" />
              <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ backgroundColor: '#0b101b', borderColor: '#1f2b45', fontSize: '11px', fontFamily: 'monospace' }} />
              <Area type="monotone" dataKey="health_index" stroke="#00f0ff" strokeWidth={2} fill="url(#subHealthGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-defense-700 font-mono text-xs flex gap-4">
        {[
          { id: 'TELEMETRY', label: `Sensors (${detail.sensors.length})` },
          { id: 'BASELINES', label: `Healthy Baselines (${detail.active_baselines.length})` },
          { id: 'ANOMALIES', label: `Anomalies (${detail.recent_anomalies.length})` },
          { id: 'MAINTENANCE', label: `Maintenance Logs (${maintenance.length})` },
          { id: 'WEIGHTS', label: 'Feature Weights & Config' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-2.5 font-bold transition-colors uppercase ${
              activeTab === tab.id
                ? 'border-b-2 border-cyan-400 text-cyan-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Sensor Channels */}
      {activeTab === 'TELEMETRY' && (
        <div className="bg-defense-900 border border-defense-700/80 rounded-lg overflow-hidden font-mono text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-defense-700 text-slate-400 bg-defense-950/60">
                <th className="py-2.5 px-4">CHANNEL ID</th>
                <th className="py-2.5 px-4">NAME</th>
                <th className="py-2.5 px-4">MEASURED TYPE</th>
                <th className="py-2.5 px-4">UNIT</th>
                <th className="py-2.5 px-4">SAMPLING RATE</th>
                <th className="py-2.5 px-4">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-defense-800">
              {detail.sensors.map((ch) => (
                <tr key={ch.id} className="hover:bg-defense-850">
                  <td className="py-2.5 px-4 text-cyan-400">{ch.channel_id}</td>
                  <td className="py-2.5 px-4 text-slate-100">{ch.name}</td>
                  <td className="py-2.5 px-4 text-slate-300">{ch.sensor_type}</td>
                  <td className="py-2.5 px-4 text-slate-400">{ch.unit}</td>
                  <td className="py-2.5 px-4 text-slate-300">{ch.sampling_rate_hz} Hz</td>
                  <td className="py-2.5 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800">
                      ACTIVE DAQ
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Baselines */}
      {activeTab === 'BASELINES' && (
        <div className="bg-defense-900 border border-defense-700/80 rounded-lg overflow-hidden font-mono text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-defense-700 text-slate-400 bg-defense-950/60">
                <th className="py-2.5 px-4">FEATURE</th>
                <th className="py-2.5 px-4">BASELINE MEAN (μ)</th>
                <th className="py-2.5 px-4">STD DEV (σ)</th>
                <th className="py-2.5 px-4">SAMPLE COUNT</th>
                <th className="py-2.5 px-4">ESTABLISHED DATE</th>
                <th className="py-2.5 px-4">VERSION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-defense-800">
              {detail.active_baselines.map((b) => (
                <tr key={b.id} className="hover:bg-defense-850">
                  <td className="py-2.5 px-4 text-cyan-300 font-semibold">{b.feature_name}</td>
                  <td className="py-2.5 px-4 text-slate-100">{b.baseline_mean.toFixed(4)}</td>
                  <td className="py-2.5 px-4 text-slate-300">{b.baseline_stddev.toFixed(4)}</td>
                  <td className="py-2.5 px-4 text-slate-400">{b.sample_count}</td>
                  <td className="py-2.5 px-4 text-slate-300">{new Date(b.established_at).toLocaleDateString()}</td>
                  <td className="py-2.5 px-4 text-slate-400">{b.version}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Anomalies */}
      {activeTab === 'ANOMALIES' && (
        <div className="bg-defense-900 border border-defense-700/80 rounded-lg overflow-hidden font-mono text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-defense-700 text-slate-400 bg-defense-950/60">
                <th className="py-2.5 px-4">TIMESTAMP</th>
                <th className="py-2.5 px-4">FEATURE</th>
                <th className="py-2.5 px-4">SEVERITY</th>
                <th className="py-2.5 px-4">ANOMALY SCORE</th>
                <th className="py-2.5 px-4">DIAGNOSIS (CLASSIFICATION)</th>
                <th className="py-2.5 px-4">METHOD</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-defense-800">
              {detail.recent_anomalies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400">
                    No anomalies recorded for this subsystem.
                  </td>
                </tr>
              ) : (
                detail.recent_anomalies.map((an) => (
                  <tr key={an.id} className="hover:bg-defense-850">
                    <td className="py-2.5 px-4 text-slate-300">{new Date(an.timestamp).toLocaleTimeString()}</td>
                    <td className="py-2.5 px-4 text-cyan-300">{an.feature_name}</td>
                    <td className="py-2.5 px-4">
                      <StatusBadge status={an.severity} size="sm" />
                    </td>
                    <td className="py-2.5 px-4 text-slate-200">{an.anomaly_score.toFixed(3)}</td>
                    <td className="py-2.5 px-4 text-amber-300 font-semibold">{an.fault_diagnosis}</td>
                    <td className="py-2.5 px-4 text-slate-400">{an.detection_method}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 4: Maintenance Logs */}
      {activeTab === 'MAINTENANCE' && (
        <div className="bg-defense-900 border border-defense-700/80 rounded-lg overflow-hidden font-mono text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-defense-700 text-slate-400 bg-defense-950/60">
                <th className="py-2.5 px-4">DATE</th>
                <th className="py-2.5 px-4">TYPE</th>
                <th className="py-2.5 px-4">PRIORITY</th>
                <th className="py-2.5 px-4">DESCRIPTION</th>
                <th className="py-2.5 px-4">DIRECTIVES / RECOMMENDATIONS</th>
                <th className="py-2.5 px-4">TECHNICIAN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-defense-800">
              {maintenance.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400">
                    No maintenance events recorded.
                  </td>
                </tr>
              ) : (
                maintenance.map((m) => (
                  <tr key={m.id} className="hover:bg-defense-850">
                    <td className="py-2.5 px-4 text-slate-300">{new Date(m.created_at).toLocaleDateString()}</td>
                    <td className="py-2.5 px-4 text-slate-100 font-semibold">{m.event_type}</td>
                    <td className="py-2.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${
                        m.maintenance_priority === 'IMMEDIATE'
                          ? 'bg-red-950 text-red-400 border border-red-800'
                          : m.maintenance_priority === 'HIGH'
                          ? 'bg-amber-950 text-amber-400 border border-amber-800'
                          : 'bg-defense-800 text-slate-300'
                      }`}>
                        {m.maintenance_priority}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-200">{m.description}</td>
                    <td className="py-2.5 px-4 text-cyan-300">{m.recommendations || 'Standard service inspection'}</td>
                    <td className="py-2.5 px-4 text-slate-400">{m.technician_name || 'Service Tech'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 5: Feature Weights (Configurable by Admin) */}
      {activeTab === 'WEIGHTS' && (
        <div className="bg-defense-900 border border-defense-700/80 rounded-lg p-6 font-mono text-xs max-w-2xl">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-defense-800">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                TRANSPARENT HEALTH INDEX WEIGHTS CONFIGURATION
              </h3>
              <p className="text-slate-400 mt-1">
                Health Index formula: HI = 100 &times; (1 - &Sigma; w_i &times; dev_i). Adjust weighting coefficients.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {Object.keys(featureWeights).length === 0 ? (
              <p className="text-slate-400">All features currently weighted equally (1.0 default coefficient).</p>
            ) : (
              Object.entries(featureWeights).map(([feat, weight]) => (
                <div key={feat} className="flex items-center justify-between gap-4">
                  <span className="text-slate-300 font-semibold">{feat}</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="10.0"
                      disabled={role !== 'ADMIN'}
                      value={weight}
                      onChange={(e) =>
                        setFeatureWeights({
                          ...featureWeights,
                          [feat]: parseFloat(e.target.value) || 1.0,
                        })
                      }
                      className="w-20 bg-defense-950 border border-defense-700 rounded px-2 py-1 text-slate-200 disabled:opacity-50"
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          {role === 'ADMIN' ? (
            <div className="mt-6 pt-4 border-t border-defense-800 flex justify-end">
              <button
                onClick={handleSaveWeights}
                disabled={weightsSaving}
                className="px-4 py-2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 transition-colors"
              >
                {weightsSaving ? 'Saving Weights...' : 'Save Configuration'}
              </button>
            </div>
          ) : (
            <p className="mt-4 text-slate-400 italic">
              * Administrator permissions required to modify weighting coefficients.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
