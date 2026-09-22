import React, { useState, useEffect } from 'react';
import { SystemOverview, Subsystem } from '../types';
import { api } from '../services/api';
import { SubsystemCard } from '../components/common/SubsystemCard';
import { StatusBadge } from '../components/common/StatusBadge';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Layers,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';

interface OverviewPageProps {
  onDrillDown: (subsystemId: string) => void;
  onNavigateAlerts: () => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ onDrillDown, onNavigateAlerts }) => {
  const [overview, setOverview] = useState<SystemOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOverview = async () => {
    try {
      const data = await api.getOverview();
      setOverview(data);
    } catch (e) {
      console.error('Failed to load overview', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    const interval = setInterval(fetchOverview, 4000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading || !overview) {
    return (
      <div className="flex items-center justify-center h-96 font-mono text-cyan-400">
        <RefreshCw className="w-6 h-6 animate-spin mr-3" />
        INITIALIZING TURRET CBPM TELEMETRY OVERVIEW...
      </div>
    );
  }

  const DASHBOARD_ORDER = ['LRF', 'ALG', 'RECOIL', 'ELEVATION', 'AZIMUTH'];

  // Sort subsystems for Dashboard cards: strictly 1. LRF, 2. ALG, 3. Recoil, 4. Elevation, 5. Azimuth
  const sortedSubsystems = [...overview.subsystems].sort((a, b) => {
    const idxA = DASHBOARD_ORDER.indexOf(a.code);
    const idxB = DASHBOARD_ORDER.indexOf(b.code);
    return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
  });

  // Subsystem Health Comparison Matrix: exactly 1. LRF, 2. ALG, 3. Recoil, 4. Elevation, 5. Azimuth
  const comparisonData = DASHBOARD_ORDER
    .map((code) => {
      const sub = overview.subsystems.find((s) => s.code === code);
      if (!sub) return null;
      const labelMap: Record<string, string> = {
        LRF: '1. LRF',
        ALG: '2. ALG',
        RECOIL: '3. Recoil',
        ELEVATION: '4. Elevation',
        AZIMUTH: '5. Azimuth',
      };
      return {
        name: labelMap[code] || sub.name,
        health: sub.current_health_index,
        code: sub.code,
        id: sub.id,
      };
    })
    .filter((entry): entry is { name: string; health: number; code: string; id: string } => entry !== null);

  return (
    <div className="space-y-6">
      {/* Top KPI Metrics Banner */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
        {/* Overall Health Index */}
        <div className="bg-defense-900 border border-defense-700/80 rounded-lg p-3.5 flex flex-col justify-between">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider">Overall Health</div>
          <div className="flex items-baseline gap-2 mt-2">
            <span
              className={`text-3xl font-bold ${
                overview.overall_health_index >= 75
                  ? 'text-emerald-400'
                  : overview.overall_health_index >= 50
                  ? 'text-amber-400'
                  : 'text-red-400'
              }`}
            >
              {overview.overall_health_index}%
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">SYSTEM STATE:</span>
            <StatusBadge status={overview.system_status} size="sm" />
          </div>
        </div>

        {/* Healthy Subsystems */}
        <div className="bg-defense-900 border border-defense-700/80 rounded-lg p-3.5 flex flex-col justify-between">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider">Nominal Subsystems</div>
          <div className="text-3xl font-bold text-emerald-400 mt-2">
            {overview.subsystems_healthy}
            <span className="text-slate-400 text-sm font-normal"> / {overview.subsystems_total}</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Within Baseline Bands
          </div>
        </div>

        {/* Degrading Subsystems */}
        <div className="bg-defense-900 border border-defense-700/80 rounded-lg p-3.5 flex flex-col justify-between">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider">Degrading Subsystems</div>
          <div className="text-3xl font-bold text-amber-400 mt-2">
            {overview.subsystems_degrading}
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5 text-amber-400" />
            Deviation &gt; 3σ
          </div>
        </div>

        {/* Warnings */}
        <div className="bg-defense-900 border border-defense-700/80 rounded-lg p-3.5 flex flex-col justify-between">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider">Active Warnings</div>
          <div className="text-3xl font-bold text-amber-400 mt-2">
            {overview.active_warnings}
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Early Anomaly Alerts
          </div>
        </div>

        {/* Critical Alerts */}
        <div className="bg-defense-900 border border-defense-700/80 rounded-lg p-3.5 flex flex-col justify-between">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider">Critical Alerts</div>
          <div className="text-3xl font-bold text-red-400 mt-2">
            {overview.active_criticals}
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Immediate Action Required
          </div>
        </div>

        {/* Ingestion Telemetry */}
        <div className="bg-defense-900 border border-defense-700/80 rounded-lg p-3.5 flex flex-col justify-between">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider">Telemetry Sensors</div>
          <div className="text-3xl font-bold text-cyan-400 mt-2">
            {overview.sensors_active}
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            DAQ Rate: ~{overview.ingestion_rate_hz} Hz
          </div>
        </div>
      </div>

      {/* Subsystem Health Cards Grid (6 Main Subsystems) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-mono font-bold tracking-wider text-cyan-400 uppercase flex items-center gap-2">
            <Cpu className="w-4 h-4" />
            TURRET SUBASSEMBLY HEALTH STATUS MATRIX
          </h2>
          <span className="text-[11px] font-mono text-slate-400">
            Ordered: 1. LRF | 2. ALG | 3. Recoil | 4. Elevation | 5. Azimuth
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedSubsystems.map((sub) => (
            <SubsystemCard
              key={sub.id}
              subsystem={sub}
              onDrillDown={(id) => onDrillDown(id)}
            />
          ))}
        </div>
      </div>

      {/* Real-time Trend & Subsystem Comparative Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Health Index Trend Chart */}
        <div className="bg-defense-900 border border-defense-700/80 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <h3 className="font-mono text-xs font-bold text-slate-100 tracking-wider uppercase">
                SYSTEM HEALTH INDEX HISTORICAL TRAJECTORY (24H)
              </h3>
            </div>
            <span className="text-[10px] font-mono bg-defense-800 text-slate-300 px-2 py-0.5 rounded">
              HI-WeightedDev-v1.0
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={overview.health_index_trend}>
                <defs>
                  <linearGradient id="healthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#00f0ff" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2b45" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0b101b', borderColor: '#1f2b45', fontSize: '12px', fontFamily: 'monospace' }}
                  itemStyle={{ color: '#00f0ff' }}
                />
                <Area type="monotone" dataKey="health_index" stroke="#00f0ff" strokeWidth={2} fillOpacity={1} fill="url(#healthGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Subsystem Health Comparison Bar Chart */}
        <div className="bg-defense-900 border border-defense-700/80 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <h3 className="font-mono text-xs font-bold text-slate-100 tracking-wider uppercase">
                SUBSYSTEM HEALTH COMPARISON MATRIX
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              0 - 100 Normalization
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2b45" />
                <XAxis type="number" domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis type="category" dataKey="name" stroke="#64748b" tick={{ fontSize: 10, fill: '#cbd5e1' }} width={120} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0b101b', borderColor: '#1f2b45', fontSize: '12px', fontFamily: 'monospace' }}
                />
                <Bar dataKey="health" radius={[0, 4, 4, 0]}>
                  {comparisonData.map((entry, index) => {
                    const color = entry.health >= 75 ? '#10b981' : entry.health >= 50 ? '#f59e0b' : '#ef4444';
                    return <Cell key={`cell-${index}`} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Alerts Feed Table */}
      <div className="bg-defense-900 border border-defense-700/80 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h3 className="font-mono text-xs font-bold text-slate-100 tracking-wider uppercase">
              ACTIVE DEFENSE CONDITION ALERTS
            </h3>
          </div>
          <button
            onClick={onNavigateAlerts}
            className="text-xs font-mono text-cyan-400 hover:underline"
          >
            Open Full Alert Workspace →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead>
              <tr className="border-b border-defense-700 text-slate-400 bg-defense-950/60">
                <th className="py-2 px-3">TIMESTAMP</th>
                <th className="py-2 px-3">SUBSYSTEM</th>
                <th className="py-2 px-3">FEATURE</th>
                <th className="py-2 px-3">SEVERITY</th>
                <th className="py-2 px-3">PROBABLE CONDITION</th>
                <th className="py-2 px-3">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-defense-800">
              {overview.recent_alerts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400">
                    No active condition alerts. All systems operating within baseline tolerance.
                  </td>
                </tr>
              ) : (
                overview.recent_alerts.map((a) => (
                  <tr key={a.id} className="hover:bg-defense-850/60">
                    <td className="py-2.5 px-3 text-slate-300">
                      {new Date(a.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 px-3 text-slate-100 font-semibold">{a.subsystem_name}</td>
                    <td className="py-2.5 px-3 text-cyan-300">{a.feature_name}</td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={a.severity} size="sm" />
                    </td>
                    <td className="py-2.5 px-3 text-slate-200">{a.probable_issue}</td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={a.status} size="sm" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
