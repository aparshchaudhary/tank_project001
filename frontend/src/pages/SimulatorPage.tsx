import React, { useState, useEffect } from 'react';
import { useTelemetry } from '../context/TelemetryContext';
import { api } from '../services/api';
import {
  Radio,
  Play,
  Square,
  Zap,
  Gauge,
  Sliders,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Layers
} from 'lucide-react';

export const SimulatorPage: React.FC = () => {
  const { simulatorStatus, refreshSimulatorStatus, triggerDemoMode } = useTelemetry();
  const [scenarios, setScenarios] = useState<string[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<string>('A. HEALTHY');
  const [speed, setSpeed] = useState<number>(1.0);
  const [severity, setSeverity] = useState<number>(0.0);
  const [noise, setNoise] = useState<number>(0.05);
  const [operatingMode, setOperatingMode] = useState<string>('SLEW_TRACKING');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const loadScenarios = async () => {
      try {
        const list = await api.getSimulatorScenarios();
        setScenarios(list);
      } catch (e) {
        console.error('Failed to load scenarios', e);
      }
    };
    loadScenarios();
  }, []);

  useEffect(() => {
    if (simulatorStatus) {
      setSelectedScenario(simulatorStatus.scenario);
      setSpeed(simulatorStatus.speed_multiplier);
      setSeverity(simulatorStatus.fault_severity);
      setNoise(simulatorStatus.noise_level);
      setOperatingMode(simulatorStatus.operating_mode);
    }
  }, [simulatorStatus?.scenario]);

  const handleStart = async () => {
    setIsUpdating(true);
    try {
      await api.controlSimulator({
        action: 'START',
        scenario: selectedScenario,
        speed_multiplier: speed,
        fault_severity: severity,
        noise_level: noise,
        operating_mode: operatingMode,
      });
      await refreshSimulatorStatus();
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStop = async () => {
    setIsUpdating(true);
    try {
      await api.controlSimulator({ action: 'STOP' });
      await refreshSimulatorStatus();
    } finally {
      setIsUpdating(false);
    }
  };

  const handleApplyParams = async () => {
    setIsUpdating(true);
    try {
      await api.controlSimulator({
        action: 'SET_SCENARIO',
        scenario: selectedScenario,
        speed_multiplier: speed,
        fault_severity: severity,
        noise_level: noise,
        operating_mode: operatingMode,
      });
      await refreshSimulatorStatus();
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <Radio className="w-5 h-5 text-cyan-400" />
            SYNTHETIC SENSOR SIMULATOR &amp; FAULT INJECTION RIG
          </h1>
          <p className="text-slate-400 mt-1">
            Simulate laboratory/test-bench condition-monitoring telemetry across selectable wear scenarios, noise conditions, and failure modes.
          </p>
        </div>

        {/* Demo Mode Button */}
        <button
          onClick={triggerDemoMode}
          className="flex items-center gap-2 px-4 py-2 rounded bg-gradient-to-r from-cyan-500/30 to-blue-500/30 text-cyan-200 border border-cyan-400/50 hover:from-cyan-500/40 hover:to-blue-500/40 transition-all font-bold tracking-wider shadow-lg"
        >
          <Sparkles className="w-4 h-4 text-cyan-300 animate-spin" />
          LAUNCH DEMO SCENARIO SEQUENCE
        </button>
      </div>

      {/* Demo Mode Active Banner */}
      {simulatorStatus?.demo_mode_active && (
        <div className="bg-cyan-950/80 border-l-4 border-cyan-400 p-4 rounded border border-cyan-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
            <div>
              <div className="font-bold text-cyan-200 text-sm">AUTOMATED DEMO SEQUENCE IN PROGRESS</div>
              <div className="text-slate-300 mt-0.5">{simulatorStatus.demo_mode_step}</div>
            </div>
          </div>
          <button
            onClick={handleStop}
            className="px-3 py-1 bg-red-500/20 text-red-300 border border-red-500/40 rounded hover:bg-red-500/30"
          >
            Abort Demo
          </button>
        </div>
      )}

      {/* Simulator Control Board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Primary Scenarios A-J */}
        <div className="lg:col-span-2 bg-defense-900 border border-defense-700/80 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-defense-800">
            <span className="font-bold text-slate-100 tracking-wider uppercase flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              SELECTABLE TELEMETRY SCENARIOS (A THROUGH J)
            </span>
            <span className="text-slate-400">10 Scenarios Configured</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {scenarios.map((sc) => {
              const isSelected = selectedScenario === sc;
              return (
                <button
                  key={sc}
                  onClick={() => setSelectedScenario(sc)}
                  className={`text-left p-3 rounded border transition-all ${
                    isSelected
                      ? 'bg-cyan-500/15 border-cyan-500 text-cyan-200 shadow-sm'
                      : 'bg-defense-950 border-defense-800 text-slate-300 hover:border-defense-700'
                  }`}
                >
                  <div className="font-bold text-xs">{sc}</div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {sc.includes('HEALTHY') && 'Stationary harmonics, 1σ normal Gaussian noise'}
                    {sc.includes('MOTOR') && 'Winding resistance heat, rising current ripple'}
                    {sc.includes('GEARBOX') && 'Gear mesh sideband vibration, peak acceleration'}
                    {sc.includes('BEARING') && 'High-frequency raceway impact spikes, high crest factor'}
                    {sc.includes('HYDRAULIC') && 'Cavitation pressure pulsation, flow deficit'}
                    {sc.includes('POSITION') && 'Overshoot, tracking error, backlash drift'}
                    {sc.includes('TEMPERATURE') && 'Progressive thermal dissipation failure'}
                    {sc.includes('DROPOUT') && 'Stuck-at-zero & intermittent missing packets'}
                    {sc.includes('COMMUNICATION') && 'Delayed delivery testing out-of-order buffer'}
                    {sc.includes('MULTIPLE') && 'Compounded mechanical, thermal & hydraulic anomalies'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Controls & Parameters */}
        <div className="bg-defense-900 border border-defense-700/80 rounded-lg p-5 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-defense-800">
            <span className="font-bold text-slate-100 tracking-wider uppercase flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              PHYSICS &amp; NOISE TUNING
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              simulatorStatus?.is_running
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                : 'bg-defense-800 text-slate-400'
            }`}>
              {simulatorStatus?.is_running ? 'GENERATOR RUNNING' : 'STOPPED'}
            </span>
          </div>

          {/* Fault Severity Slider */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-slate-400">Fault Severity (Intensity):</span>
              <span className="text-amber-400 font-bold">{(severity * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={severity}
              onChange={(e) => setSeverity(parseFloat(e.target.value))}
              className="w-full accent-cyan-400"
            />
          </div>

          {/* Speed Multiplier */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-slate-400">Simulation Speed Multiplier:</span>
              <span className="text-cyan-400 font-bold">{speed.toFixed(1)}x</span>
            </div>
            <div className="flex gap-2">
              {[0.5, 1.0, 2.0, 5.0].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`flex-1 py-1 rounded border ${
                    speed === s
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                      : 'bg-defense-950 border-defense-800 text-slate-400'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Noise Level */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-slate-400">Noise Level (&sigma; Jitter):</span>
              <span className="text-slate-200 font-bold">{(noise * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.01"
              max="0.30"
              step="0.02"
              value={noise}
              onChange={(e) => setNoise(parseFloat(e.target.value))}
              className="w-full accent-cyan-400"
            />
          </div>

          {/* Operating Mode */}
          <div>
            <label className="block text-slate-400 mb-1">Operating Mode:</label>
            <select
              value={operatingMode}
              onChange={(e) => setOperatingMode(e.target.value)}
              className="w-full bg-defense-950 border border-defense-700 text-slate-200 rounded p-2"
            >
              <option value="STANDBY">STANDBY (IDLE LAB TEST)</option>
              <option value="SLEW_TRACKING">SLEW_TRACKING (AZIMUTH ROTATION)</option>
              <option value="HIGH_SPEED_TRAVERSE">HIGH_SPEED_TRAVERSE (FULL POWER)</option>
              <option value="ELEVATION_CYCLING">ELEVATION_CYCLING (HYDRAULIC LOAD)</option>
            </select>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-defense-800 flex flex-col gap-2">
            {!simulatorStatus?.is_running ? (
              <button
                onClick={handleStart}
                disabled={isUpdating}
                className="w-full flex items-center justify-center gap-2 py-2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-500/30 transition-colors font-bold text-sm"
              >
                <Play className="w-4 h-4 fill-current" />
                START TELEMETRY STREAM
              </button>
            ) : (
              <button
                onClick={handleStop}
                disabled={isUpdating}
                className="w-full flex items-center justify-center gap-2 py-2 rounded bg-red-500/20 text-red-300 border border-red-500/50 hover:bg-red-500/30 transition-colors font-bold text-sm"
              >
                <Square className="w-4 h-4 fill-current" />
                STOP TELEMETRY STREAM
              </button>
            )}

            <button
              onClick={handleApplyParams}
              disabled={isUpdating}
              className="w-full py-1.5 rounded bg-defense-800 text-slate-300 border border-defense-700 hover:bg-defense-700 transition-colors"
            >
              Apply Parameter Updates
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
