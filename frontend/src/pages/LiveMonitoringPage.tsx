import React, { useState, useEffect } from 'react';
import { useTelemetry } from '../context/TelemetryContext';
import { StatusBadge } from '../components/common/StatusBadge';
import {
  Activity,
  Zap,
  Thermometer,
  Gauge,
  Navigation,
  RefreshCw,
  Clock,
  Radio,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface TimePoint {
  time: string;
  vibration_rms: number;
  motor_current: number;
  temperature: number;
  pressure: number;
  position_error: number;
}

export const LiveMonitoringPage: React.FC = () => {
  const { latestBatch, isConnected, simulatorStatus } = useTelemetry();
  const [historyBuffer, setHistoryBuffer] = useState<TimePoint[]>([]);

  // Keep a running buffer of the last 30 telemetry points
  useEffect(() => {
    if (!latestBatch || latestBatch.length === 0) return;

    const timeStr = new Date().toLocaleTimeString();
    // Aggregate primary metrics from the batch
    let vib = 0.85;
    let curr = 14.2;
    let temp = 48.0;
    let press = 160.0;
    let posErr = 0.008;

    latestBatch.forEach((item) => {
      const f = item.features;
      if (f.vibration_rms !== undefined) vib = f.vibration_rms;
      if (f.motor_rms_current !== undefined) curr = f.motor_rms_current;
      if (f.temperature !== undefined) temp = f.temperature;
      if (f.pressure !== undefined) press = f.pressure;
      if (f.position_error !== undefined) posErr = f.position_error;
    });

    setHistoryBuffer((prev) => {
      const next = [...prev, {
        time: timeStr,
        vibration_rms: Number(vib.toFixed(3)),
        motor_current: Number(curr.toFixed(2)),
        temperature: Number(temp.toFixed(1)),
        pressure: Number(press.toFixed(1)),
        position_error: Number((posErr * 1000).toFixed(2)), // in mdeg
      }];
      return next.slice(-30);
    });
  }, [latestBatch]);

  // Extract latest channel readings
  const getSubsystemData = (code: string) => {
    return latestBatch.find((b) => b.subsystem_code === code);
  };

  const bearingData = getSubsystemData('BEARING_SYSTEM') || getSubsystemData('TURRET_DRIVE');
  const motorData = getSubsystemData('MOTOR');
  const hydraulicData = getSubsystemData('HYDRAULIC_UNIT');
  const positionData = getSubsystemData('POSITION_SYSTEM');

  return (
    <div className="space-y-6">
      {/* Live Status Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-defense-900 border border-defense-700/80 rounded-lg p-4 font-mono">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
          <div>
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              REAL-TIME SENSOR TELEMETRY BUS (WEBSOCKET DAQ)
            </h2>
            <div className="text-xs text-slate-400">
              Active Scenario: <span className="text-cyan-300 font-semibold">{simulatorStatus?.scenario || 'HEALTHY'}</span> | 
              Severity: <span className="text-amber-300 font-semibold">{((simulatorStatus?.fault_severity || 0) * 100).toFixed(0)}%</span> | 
              Mode: <span className="text-slate-300">{simulatorStatus?.operating_mode || 'NORMAL'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="bg-defense-950 px-3 py-1.5 rounded border border-defense-800">
            <span className="text-slate-400">Points Received: </span>
            <span className="text-cyan-400 font-bold">{simulatorStatus?.readings_generated_count || 0}</span>
          </div>
          <div className="bg-defense-950 px-3 py-1.5 rounded border border-defense-800">
            <span className="text-slate-400">Speed: </span>
            <span className="text-emerald-400 font-bold">{simulatorStatus?.speed_multiplier || 1.0}x</span>
          </div>
        </div>
      </div>

      {/* Primary Telemetry Channel Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        {/* 1. Vibration Channel */}
        <div className="bg-defense-900 border border-defense-700/80 rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-defense-800">
            <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
              <Activity className="w-3.5 h-3.5" /> VIBRATION RMS
            </span>
            <span className="text-[10px] bg-defense-800 px-1.5 py-0.5 rounded">BEARING/DRIVE</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-100">
              {bearingData?.features.vibration_rms?.toFixed(3) || '0.850'} <span className="text-xs font-normal text-slate-400">mm/s</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
              <span>Baseline: 0.650 mm/s</span>
              <span className={bearingData?.features.vibration_rms && bearingData.features.vibration_rms > 1.0 ? 'text-amber-400' : 'text-emerald-400'}>
                Δ {((bearingData?.features.vibration_rms || 0.65) - 0.65).toFixed(3)}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Motor RMS Current */}
        <div className="bg-defense-900 border border-defense-700/80 rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-defense-800">
            <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
              <Zap className="w-3.5 h-3.5" /> MOTOR CURRENT
            </span>
            <span className="text-[10px] bg-defense-800 px-1.5 py-0.5 rounded">AZIMUTH SERVO</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-100">
              {motorData?.features.motor_rms_current?.toFixed(2) || '14.20'} <span className="text-xs font-normal text-slate-400">A</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
              <span>Baseline: 14.20 A</span>
              <span className={motorData?.features.motor_rms_current && motorData.features.motor_rms_current > 18.0 ? 'text-red-400' : 'text-emerald-400'}>
                Δ {((motorData?.features.motor_rms_current || 14.2) - 14.2).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Hydraulic Pressure */}
        <div className="bg-defense-900 border border-defense-700/80 rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-defense-800">
            <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
              <Gauge className="w-3.5 h-3.5" /> HYDRAULIC PRESSURE
            </span>
            <span className="text-[10px] bg-defense-800 px-1.5 py-0.5 rounded">ELEVATION/BUFFER</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-100">
              {hydraulicData?.features.pressure?.toFixed(1) || '160.0'} <span className="text-xs font-normal text-slate-400">bar</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
              <span>Baseline: 160.0 bar</span>
              <span className="text-emerald-400">Var: {hydraulicData?.features.hydraulic_pressure_variation?.toFixed(1) || '4.5'} bar</span>
            </div>
          </div>
        </div>

        {/* 4. Position Tracking Error */}
        <div className="bg-defense-900 border border-defense-700/80 rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-defense-800">
            <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
              <Navigation className="w-3.5 h-3.5" /> RESOLVER ERROR
            </span>
            <span className="text-[10px] bg-defense-800 px-1.5 py-0.5 rounded">DUAL RESOLVER</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-100">
              {((positionData?.features.position_error || 0.008) * 1000).toFixed(1)} <span className="text-xs font-normal text-slate-400">mdeg</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
              <span>Baseline: 8.0 mdeg</span>
              <span className={positionData?.features.position_error && positionData.features.position_error > 0.02 ? 'text-red-400' : 'text-emerald-400'}>
                Overshoot: {((positionData?.features.overshoot || 0.012) * 1000).toFixed(1)} mdeg
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Oscilloscope Telemetry Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Live Vibration Stream */}
        <div className="bg-defense-900 border border-defense-700/80 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3 font-mono text-xs">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-slate-200">VIBRATION RMS ACCELERATION STREAM</span>
            </div>
            <span className="text-slate-400 text-[11px]">Threshold: 1.50 mm/s</span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyBuffer}>
                <CartesianGrid strokeDasharray="2 2" stroke="#1f2b45" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis domain={[0, 4]} stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ backgroundColor: '#0b101b', borderColor: '#1f2b45', fontSize: '11px', fontFamily: 'monospace' }} />
                <ReferenceLine y={0.65} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Baseline', fill: '#10b981', fontSize: 10 }} />
                <ReferenceLine y={1.50} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Critical', fill: '#ef4444', fontSize: 10 }} />
                <Line type="monotone" dataKey="vibration_rms" stroke="#00f0ff" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Motor Current Stream */}
        <div className="bg-defense-900 border border-defense-700/80 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3 font-mono text-xs">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-slate-200">MOTOR RMS CURRENT DRAW STREAM</span>
            </div>
            <span className="text-slate-400 text-[11px]">Threshold: 22.0 A</span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyBuffer}>
                <CartesianGrid strokeDasharray="2 2" stroke="#1f2b45" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis domain={[10, 35]} stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ backgroundColor: '#0b101b', borderColor: '#1f2b45', fontSize: '11px', fontFamily: 'monospace' }} />
                <ReferenceLine y={14.2} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Nominal', fill: '#10b981', fontSize: 10 }} />
                <ReferenceLine y={22.0} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Overcurrent', fill: '#ef4444', fontSize: 10 }} />
                <Line type="monotone" dataKey="motor_current" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Temperature Stream */}
        <div className="bg-defense-900 border border-defense-700/80 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3 font-mono text-xs">
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-red-400" />
              <span className="font-bold text-slate-200">DRIVE TEMPERATURE STREAM (°C)</span>
            </div>
            <span className="text-slate-400 text-[11px]">Warning: 75 °C</span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyBuffer}>
                <CartesianGrid strokeDasharray="2 2" stroke="#1f2b45" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis domain={[30, 95]} stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ backgroundColor: '#0b101b', borderColor: '#1f2b45', fontSize: '11px', fontFamily: 'monospace' }} />
                <ReferenceLine y={48.0} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Nominal', fill: '#10b981', fontSize: 10 }} />
                <ReferenceLine y={75.0} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Warning', fill: '#ef4444', fontSize: 10 }} />
                <Line type="monotone" dataKey="temperature" stroke="#ef4444" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Position Error Stream */}
        <div className="bg-defense-900 border border-defense-700/80 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3 font-mono text-xs">
            <div className="flex items-center gap-2">
              <Navigation className="w-4 h-4 text-purple-400" />
              <span className="font-bold text-slate-200">POSITION TRACKING ERROR (MILLIDEGREES)</span>
            </div>
            <span className="text-slate-400 text-[11px]">Tolerance: &lt; 30 mdeg</span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyBuffer}>
                <CartesianGrid strokeDasharray="2 2" stroke="#1f2b45" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis domain={[0, 80]} stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ backgroundColor: '#0b101b', borderColor: '#1f2b45', fontSize: '11px', fontFamily: 'monospace' }} />
                <ReferenceLine y={8.0} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Baseline', fill: '#10b981', fontSize: 10 }} />
                <ReferenceLine y={35.0} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Limit', fill: '#ef4444', fontSize: 10 }} />
                <Line type="monotone" dataKey="position_error" stroke="#a855f7" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
