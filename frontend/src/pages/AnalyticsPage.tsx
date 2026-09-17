import React, { useState, useEffect } from 'react';
import { Subsystem, HealthIndexHistoryItem } from '../types';
import { api } from '../services/api';
import {
  TrendingDown,
  Activity,
  BarChart3,
  Layers,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis
} from 'recharts';

export const AnalyticsPage: React.FC = () => {
  const [subsystems, setSubsystems] = useState<Subsystem[]>([]);
  const [selectedSubsystem, setSelectedSubsystem] = useState<string>('');
  const [history, setHistory] = useState<HealthIndexHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const subs = await api.getSubsystems();
        setSubsystems(subs);
        if (subs.length > 0) {
          const defaultId = subs.find(s => s.code === 'BEARING_SYSTEM')?.id || subs[0].id;
          setSelectedSubsystem(defaultId);
        }
      } catch (e) {
        console.error('Failed to load analytics', e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!selectedSubsystem) return;
    const loadHist = async () => {
      try {
        const h = await api.getHealthHistory(selectedSubsystem, 50);
        setHistory(h);
      } catch (e) {
        console.error('Failed to load history', e);
      }
    };
    loadHist();
  }, [selectedSubsystem]);

  const targetSub = subsystems.find((s) => s.id === selectedSubsystem);

  // Simulated multi-channel correlation data
  const correlationData = history.map((item, idx) => {
    const dev = (100 - item.health_index) / 20.0;
    return {
      vibration_rms: Number((0.65 + dev * 0.45).toFixed(3)),
      temperature: Number((42.0 + dev * 8.5).toFixed(1)),
      health_index: item.health_index,
      index: idx,
    };
  });

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Header & Subsystem Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-cyan-400" />
            HISTORICAL CONDITION ANALYTICS & DEGRADATION TRENDING
          </h1>
          <p className="text-slate-400 mt-1">
            Long-term health index progression, multi-sensor correlation signatures, and statistical deviation modelling.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400">Target Subsystem:</span>
          <select
            value={selectedSubsystem}
            onChange={(e) => setSelectedSubsystem(e.target.value)}
            className="bg-defense-900 border border-defense-700 text-slate-200 rounded px-3 py-1.5"
          >
            {subsystems.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.category})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Degradation Trend Curve */}
      <div className="bg-defense-900 border border-defense-700/80 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h2 className="font-bold text-slate-100 tracking-wider uppercase">
              {targetSub?.name} &bull; HEALTH INDEX TRAJECTORY
            </h2>
          </div>
          <span className="text-slate-400 text-[11px]">Historical observations: {history.length}</span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2b45" />
              <XAxis
                dataKey="timestamp"
                stroke="#64748b"
                tickFormatter={(val) => new Date(val).toLocaleTimeString()}
                tick={{ fontSize: 10, fill: '#94a3b8' }}
              />
              <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0b101b', borderColor: '#1f2b45', fontSize: '11px', fontFamily: 'monospace' }}
                labelFormatter={(val) => new Date(val).toLocaleString()}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="health_index"
                name="Health Index (%)"
                stroke="#00f0ff"
                strokeWidth={2}
                dot={{ r: 2, fill: '#00f0ff' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Multi-Channel Cross-Feature Correlation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-defense-900 border border-defense-700/80 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-400" />
              <h2 className="font-bold text-slate-100 tracking-wider uppercase">
                VIBRATION VS TEMPERATURE CORRELATION
              </h2>
            </div>
            <span className="text-slate-400 text-[11px]">Scatter Analysis</span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2b45" />
                <XAxis
                  type="number"
                  dataKey="vibration_rms"
                  name="Vibration RMS"
                  unit=" mm/s"
                  stroke="#64748b"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                />
                <YAxis
                  type="number"
                  dataKey="temperature"
                  name="Temperature"
                  unit=" °C"
                  stroke="#64748b"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{ backgroundColor: '#0b101b', borderColor: '#1f2b45', fontSize: '11px', fontFamily: 'monospace' }}
                />
                <Scatter name="Telemetry Cluster" data={correlationData} fill="#f59e0b" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Statistical Distribution & Baseline Bands */}
        <div className="bg-defense-900 border border-defense-700/80 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <h2 className="font-bold text-slate-100 tracking-wider uppercase">
                HEALTH INDEX STATUS BANDS DISTRIBUTION
              </h2>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {[
              { band: '90 - 100 HEALTHY', color: 'bg-emerald-500', desc: 'Operating within 1σ nominal healthy baseline limits' },
              { band: '75 - 90 NORMAL / EARLY DEVIATION', color: 'bg-cyan-500', desc: 'Mild non-critical thermal or mechanical jitter (1σ to 2σ)' },
              { band: '50 - 75 DEGRADING', color: 'bg-amber-500', desc: 'Statistical deviation trips warning boundary (2σ to 3σ)' },
              { band: '25 - 50 SIGNIFICANT DEGRADATION', color: 'bg-orange-500', desc: 'Sustained abnormal harmonics, imminent service alert' },
              { band: '0 - 25 SEVERE CONDITION', color: 'bg-red-500', desc: 'Critical mechanical wear or pressure loss, immediate action' },
            ].map((b, i) => (
              <div key={i} className="bg-defense-950 p-2.5 rounded border border-defense-800 flex items-start gap-3">
                <span className={`w-3 h-3 rounded-full mt-0.5 flex-shrink-0 ${b.color}`} />
                <div>
                  <div className="font-bold text-slate-200">{b.band}</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">{b.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
