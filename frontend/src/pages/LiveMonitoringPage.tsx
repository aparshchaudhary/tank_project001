import React, { useState, useEffect } from 'react';
import { useTelemetry } from '../context/TelemetryContext';
import { StatusBadge } from '../components/common/StatusBadge';
import {
  Activity,
  Zap,
  Gauge,
  Sliders,
  CheckCircle2,
  RefreshCw,
  Clock,
  Radio,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
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

interface TelemetryPoint {
  time: string;
  recoil_speed: number;          // m/s
  recoil_distance: number;       // mm (250-300 normal, 300-350 warning, >350 critical)
  oil_level: number;             // %
  lrf_voltage: number;           // V (9.5 - 12.0 V, nominal band)
  alg_circuit: number;           // 1.0 continuous, 0.0 interrupted
  k1_forward: number;            // 1 or 0
  k2_reverse: number;            // 1 or 0
  k3_forward: number;            // 1 or 0
  k4_reverse: number;            // 1 or 0
  elevation_voltage: number;     // V (25-40 V normal)
  elevation_up_voltage: number;  // V (25-40 V digital signal)
  elevation_down_voltage: number;// V (25-40 V digital signal)
  azimuth_voltage: number;       // V (25-40 V normal)
  azimuth_left_signal: number;   // V (25-40 V directional signal)
  azimuth_right_signal: number;  // V (25-40 V directional signal)
}

export const LiveMonitoringPage: React.FC = () => {
  const { latestBatch, isConnected, simulatorStatus } = useTelemetry();
  const [historyBuffer, setHistoryBuffer] = useState<TelemetryPoint[]>([]);

  // Keep a running buffer of the last 30 telemetry points
  useEffect(() => {
    if (!latestBatch || latestBatch.length === 0) return;

    const timeStr = new Date().toLocaleTimeString();

    // Default nominal baseline values
    let recTime = 0.15;
    let recSpeed = 1.85;
    let recDist = 275.0;
    let recOil = 94.0;
    let lrfVolt = 11.5;
    let algCircuit = 1.0;
    let k1Fwd = 1;
    let k2Rev = 1;
    let k3Fwd = 1;
    let k4Rev = 1;
    let elevVolt = 32.5;
    let elevUpVolt = 32.5;
    let elevDownVolt = 32.5;
    let azimVolt = 34.0;
    let azimLeftSig = 33.5;
    let azimRightSig = 33.5;

    latestBatch.forEach((item) => {
      const f = item.features;
      if (item.subsystem_code === 'RECOIL') {
        if (f.recoil_time !== undefined) recTime = f.recoil_time;
        if (f.recoil_distance !== undefined) recDist = f.recoil_distance;
        if (f.recoil_speed !== undefined) {
          recSpeed = f.recoil_speed;
        } else if (recDist && recTime > 0) {
          recSpeed = (recDist / 1000.0) / recTime;
        }
        if (f.oil_level !== undefined) recOil = f.oil_level;
      } else if (item.subsystem_code === 'LRF') {
        if (f.detector_voltage !== undefined) lrfVolt = f.detector_voltage;
      } else if (item.subsystem_code === 'ALG') {
        if (f.circuit_serviceability !== undefined) algCircuit = f.circuit_serviceability;
        if (f.k1_forward !== undefined) k1Fwd = Math.round(f.k1_forward);
        if (f.k2_reverse !== undefined) k2Rev = Math.round(f.k2_reverse);
        if (f.k3_forward !== undefined) k3Fwd = Math.round(f.k3_forward);
        if (f.k4_reverse !== undefined) k4Rev = Math.round(f.k4_reverse);
      } else if (item.subsystem_code === 'ELEVATION') {
        if (f.elevation_up_voltage !== undefined) elevUpVolt = f.elevation_up_voltage;
        if (f.elevation_down_voltage !== undefined) elevDownVolt = f.elevation_down_voltage;
        if (f.k1_voltage !== undefined) elevVolt = f.k1_voltage;
        else if (f.psm_voltage !== undefined) elevVolt = f.psm_voltage;
        else elevVolt = elevUpVolt;
      } else if (item.subsystem_code === 'AZIMUTH') {
        if (f.azimuth_left_signal !== undefined) azimLeftSig = f.azimuth_left_signal;
        if (f.azimuth_right_signal !== undefined) azimRightSig = f.azimuth_right_signal;
        if (f.motor_voltage !== undefined) azimVolt = f.motor_voltage;
        else if (f.k1_voltage !== undefined) azimVolt = f.k1_voltage;
        else azimVolt = azimLeftSig;
      }
    });

    setHistoryBuffer((prev) => {
      const next = [
        ...prev,
        {
          time: timeStr,
          recoil_speed: Number(recSpeed.toFixed(2)),
          recoil_distance: Number(recDist.toFixed(1)),
          oil_level: Number(recOil.toFixed(1)),
          lrf_voltage: Number(lrfVolt.toFixed(2)),
          alg_circuit: Number(algCircuit.toFixed(1)),
          k1_forward: k1Fwd,
          k2_reverse: k2Rev,
          k3_forward: k3Fwd,
          k4_reverse: k4Rev,
          elevation_voltage: Number(elevVolt.toFixed(2)),
          elevation_up_voltage: Number(elevUpVolt.toFixed(2)),
          elevation_down_voltage: Number(elevDownVolt.toFixed(2)),
          azimuth_voltage: Number(azimVolt.toFixed(2)),
          azimuth_left_signal: Number(azimLeftSig.toFixed(2)),
          azimuth_right_signal: Number(azimRightSig.toFixed(2)),
        },
      ];
      return next.slice(-30);
    });
  }, [latestBatch]);

  // Extract latest channel readings per subsystem
  const getSubsystemData = (code: string) => {
    return latestBatch.find((b) => b.subsystem_code === code);
  };

  const recoilData = getSubsystemData('RECOIL');
  const lrfData = getSubsystemData('LRF');
  const algData = getSubsystemData('ALG');
  const elevationData = getSubsystemData('ELEVATION');
  const azimuthData = getSubsystemData('AZIMUTH');

  // Recoil distance status calculation
  const recoilDist = recoilData?.features.recoil_distance ?? 275.0;
  const recoilDistStatus =
    recoilDist > 350.0 ? 'CRITICAL' : recoilDist > 300.0 ? 'WARNING' : recoilDist < 250.0 ? 'WARNING' : 'NORMAL';

  // LRF voltage status calculation
  const lrfVoltVal = lrfData?.features.detector_voltage ?? 11.0;
  const lrfVoltStatus =
    lrfVoltVal < 9.5 || lrfVoltVal > 12.0
      ? 'CRITICAL'
      : 'NORMAL';

  // ALG Switches status extraction (binary 0 and 1)
  const k1Forward = algData?.features.k1_forward !== undefined ? (algData.features.k1_forward >= 0.5 ? 1 : 0) : 1;
  const k2Reverse = algData?.features.k2_reverse !== undefined ? (algData.features.k2_reverse >= 0.5 ? 1 : 0) : 1;
  const k3Forward = algData?.features.k3_forward !== undefined ? (algData.features.k3_forward >= 0.5 ? 1 : 0) : 1;
  const k4Reverse = algData?.features.k4_reverse !== undefined ? (algData.features.k4_reverse >= 0.5 ? 1 : 0) : 1;
  const algAllSwitchesOn = k1Forward === 1 && k2Reverse === 1 && k3Forward === 1 && k4Reverse === 1;
  const algActiveSwitchesCount = [k1Forward, k2Reverse, k3Forward, k4Reverse].filter(v => v === 1).length;

  // Elevation UP and DOWN signals
  const elevUpVal = elevationData?.features.elevation_up_voltage ?? elevationData?.features.k1_voltage ?? 32.5;
  const elevDownVal = elevationData?.features.elevation_down_voltage ?? elevationData?.features.psm_voltage ?? 32.5;
  const elevUpStatus = elevUpVal < 25.0 || elevUpVal > 40.0 ? 'WARNING' : 'NORMAL';
  const elevDownStatus = elevDownVal < 25.0 || elevDownVal > 40.0 ? 'WARNING' : 'NORMAL';

  // Azimuth LEFT and RIGHT signals
  const azimLeftVal = azimuthData?.features.azimuth_left_signal ?? azimuthData?.features.motor_voltage ?? 33.5;
  const azimRightVal = azimuthData?.features.azimuth_right_signal ?? azimuthData?.features.k1_voltage ?? 33.5;
  const azimLeftStatus = azimLeftVal < 25.0 || azimLeftVal > 40.0 ? 'WARNING' : 'NORMAL';
  const azimRightStatus = azimRightVal < 25.0 || azimRightVal > 40.0 ? 'WARNING' : 'NORMAL';

  return (
    <div className="space-y-6">
      {/* Live Status Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-defense-900 border border-defense-700/80 rounded-lg p-4 font-mono">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
          <div>
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              REAL-TIME TURRET SENSOR TELEMETRY BUS (WEBSOCKET DAQ)
            </h2>
            <div className="text-xs text-slate-400 mt-0.5">
              Live Ingestion: <span className="text-emerald-400 font-semibold">ONLINE / STREAMING</span> | 
              Mode: <span className="text-cyan-300 font-semibold">DIRECT SENSOR ACQUISITION</span> | 
              Channel Sync: <span className="text-slate-300">ACTIVE</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="bg-defense-950 px-3 py-1.5 rounded border border-defense-800">
            <span className="text-slate-400">Connection: </span>
            <span className={isConnected ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
              {isConnected ? "CONNECTED" : "OFFLINE"}
            </span>
          </div>
          <div className="bg-defense-950 px-3 py-1.5 rounded border border-defense-800">
            <span className="text-slate-400">Stream Buffer: </span>
            <span className="text-cyan-400 font-bold">{historyBuffer.length} Points</span>
          </div>
        </div>
      </div>

      {/* Primary Telemetry Channel Cards - Exactly Reordered (1 to 6) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-mono">
        {/* 1. Recoil Speed Sensor */}
        <div className="bg-defense-900 border border-defense-700/80 rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-defense-800">
            <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
              <Activity className="w-3.5 h-3.5" /> 1. RECOIL SPEED SENSOR
            </span>
            <span className="text-[10px] bg-defense-800 px-1.5 py-0.5 rounded">RECOIL</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-100">
              {(() => {
                const spd = recoilData?.features.recoil_speed;
                const time = recoilData?.features.recoil_time ?? 0.15;
                if (spd !== undefined) return spd.toFixed(2);
                if (recoilDist && time > 0) return ((recoilDist / 1000.0) / time).toFixed(2);
                return '1.85';
              })()}{' '}
              <span className="text-xs font-normal text-slate-400">m/s</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
              <span>Baseline: 1.85 m/s</span>
              <span className={(recoilData?.features.recoil_time ?? 0.15) < 0.20 ? 'text-emerald-400' : 'text-amber-400 font-bold'}>
                Stroke Time: {(recoilData?.features.recoil_time ?? 0.15).toFixed(2)} s (&lt; 0.20 s)
              </span>
            </div>
          </div>
        </div>

        {/* 2. Recoil Distance Reading (no mention of reservoir) */}
        <div className="bg-defense-900 border border-defense-700/80 rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-defense-800">
            <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
              <Gauge className="w-3.5 h-3.5" /> 2. RECOIL DISTANCE READING
            </span>
            <span className="text-[10px] bg-defense-800 px-1.5 py-0.5 rounded">RECOIL</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-100">
              {recoilDist.toFixed(1)}{' '}
              <span className="text-xs font-normal text-slate-400">mm</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
              <span>Specified: 250 – 300 mm</span>
              <span
                className={
                  recoilDistStatus === 'CRITICAL'
                    ? 'text-red-400 font-bold'
                    : recoilDistStatus === 'WARNING'
                    ? 'text-amber-400 font-semibold'
                    : 'text-emerald-400'
                }
              >
                {recoilDistStatus === 'NORMAL' ? 'NORMAL' : `${recoilDistStatus}`}
              </span>
            </div>
          </div>
        </div>

        {/* 3. LRF Voltage */}
        <div className="bg-defense-900 border border-defense-700/80 rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-defense-800">
            <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
              <Zap className="w-3.5 h-3.5" /> 3. LRF VOLTAGE
            </span>
            <span className="text-[10px] bg-defense-800 px-1.5 py-0.5 rounded">LRF DETECTOR</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-100">
              {lrfVoltVal.toFixed(2)}{' '}
              <span className="text-xs font-normal text-slate-400">V (Voltage)</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
              <span>Expected: 9.5 – 12.0 V</span>
              <span
                className={
                  lrfVoltStatus === 'CRITICAL'
                    ? 'text-red-400 font-bold'
                    : 'text-emerald-400'
                }
              >
                {lrfVoltStatus === 'NORMAL' ? '9.5-12 V OK' : lrfVoltStatus}
              </span>
            </div>
          </div>
        </div>

        {/* 4. ALG Circuit Monitoring - K1, K2, K3, K4 Switches */}
        <div className="bg-defense-900 border border-defense-700/80 rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-defense-800">
            <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" /> 4. ALG CIRCUIT MONITORING
            </span>
            <span className="text-[10px] bg-defense-800 px-1.5 py-0.5 rounded">AUTOLOADER</span>
          </div>
          <div className="mt-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">ALG CIRCUIT SWITCHES (K1–K4)</span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${algAllSwitchesOn ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                {algAllSwitchesOn ? 'ALL SWITCHES ACTIVE (1)' : `${algActiveSwitchesCount}/4 ACTIVE`}
              </span>
            </div>

            {/* 4 Switches Grid: K1 Forward, K2 Reverse, K3 Forward, K4 Reverse */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 font-mono">
              {/* K1 - Forward */}
              <div className={`p-2 rounded border transition-colors ${k1Forward === 1 ? 'bg-emerald-950/40 border-emerald-500/50' : 'bg-red-950/40 border-red-500/50'}`}>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-bold">K1</span>
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${k1Forward === 1 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                    {k1Forward === 1 ? 'ON (1)' : 'OFF (0)'}
                  </span>
                </div>
                <div className="text-[11px] font-bold text-slate-100 mt-1">FORWARD</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Value: <span className={k1Forward === 1 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>{k1Forward}</span></div>
              </div>

              {/* K2 - Reverse */}
              <div className={`p-2 rounded border transition-colors ${k2Reverse === 1 ? 'bg-emerald-950/40 border-emerald-500/50' : 'bg-red-950/40 border-red-500/50'}`}>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-bold">K2</span>
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${k2Reverse === 1 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                    {k2Reverse === 1 ? 'ON (1)' : 'OFF (0)'}
                  </span>
                </div>
                <div className="text-[11px] font-bold text-slate-100 mt-1">REVERSE</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Value: <span className={k2Reverse === 1 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>{k2Reverse}</span></div>
              </div>

              {/* K3 - Forward */}
              <div className={`p-2 rounded border transition-colors ${k3Forward === 1 ? 'bg-emerald-950/40 border-emerald-500/50' : 'bg-red-950/40 border-red-500/50'}`}>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-bold">K3</span>
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${k3Forward === 1 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                    {k3Forward === 1 ? 'ON (1)' : 'OFF (0)'}
                  </span>
                </div>
                <div className="text-[11px] font-bold text-slate-100 mt-1">FORWARD</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Value: <span className={k3Forward === 1 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>{k3Forward}</span></div>
              </div>

              {/* K4 - Reverse */}
              <div className={`p-2 rounded border transition-colors ${k4Reverse === 1 ? 'bg-emerald-950/40 border-emerald-500/50' : 'bg-red-950/40 border-red-500/50'}`}>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-bold">K4</span>
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${k4Reverse === 1 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                    {k4Reverse === 1 ? 'ON (1)' : 'OFF (0)'}
                  </span>
                </div>
                <div className="text-[11px] font-bold text-slate-100 mt-1">REVERSE</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Value: <span className={k4Reverse === 1 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>{k4Reverse}</span></div>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 mt-2 flex justify-between">
              <span>Continuity: <span className={algData?.features.circuit_serviceability !== 0 ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>{algData?.features.circuit_serviceability !== 0 ? 'CONTINUOUS (1)' : 'INTERRUPTED (0)'}</span></span>
              <span className="text-cyan-400 text-[10px]">Signal: Real-time Ingestion</span>
            </div>
          </div>
        </div>

        {/* 5. Elevation Voltage Sensor - UP and DOWN Signals */}
        <div className="bg-defense-900 border border-defense-700/80 rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-defense-800">
            <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
              <Zap className="w-3.5 h-3.5" /> 5. ELEVATION VOLTAGE SENSOR
            </span>
            <span className="text-[10px] bg-defense-800 px-1.5 py-0.5 rounded">ELEVATION</span>
          </div>
          <div className="mt-2.5">
            <div className="grid grid-cols-2 gap-2 font-mono">
              {/* UP Voltage Signal */}
              <div className="bg-defense-950/80 p-2.5 rounded border border-defense-800">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-bold text-amber-400">UP VOLTAGE</span>
                  <span className={`px-1 rounded text-[9px] font-bold ${elevUpStatus === 'NORMAL' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                    {elevUpStatus === 'NORMAL' ? '25-40V OK' : 'WARNING'}
                  </span>
                </div>
                <div className="text-xl font-bold text-slate-100 mt-1">
                  {elevUpVal.toFixed(2)}{' '}
                  <span className="text-xs font-normal text-slate-400">V</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Digital UP Signal</div>
              </div>

              {/* DOWN Voltage Signal */}
              <div className="bg-defense-950/80 p-2.5 rounded border border-defense-800">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-bold text-sky-400">DOWN VOLTAGE</span>
                  <span className={`px-1 rounded text-[9px] font-bold ${elevDownStatus === 'NORMAL' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                    {elevDownStatus === 'NORMAL' ? '25-40V OK' : 'WARNING'}
                  </span>
                </div>
                <div className="text-xl font-bold text-slate-100 mt-1">
                  {elevDownVal.toFixed(2)}{' '}
                  <span className="text-xs font-normal text-slate-400">V</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Digital DOWN Signal</div>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 mt-2 flex justify-between">
              <span>Band: 25.0 – 40.0 V (IDEAL)</span>
              <span className="text-emerald-400">
                Hydraulic: {elevationData?.features.hydraulic_pressure?.toFixed(1) || '125.0'} MPa
              </span>
            </div>
          </div>
        </div>

        {/* 6. Azimuth Voltage Sensor - LEFT and RIGHT Directional Signals */}
        <div className="bg-defense-900 border border-defense-700/80 rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-defense-800">
            <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
              <Zap className="w-3.5 h-3.5" /> 6. AZIMUTH VOLTAGE SENSOR
            </span>
            <span className="text-[10px] bg-defense-800 px-1.5 py-0.5 rounded">AZIMUTH / SLEW</span>
          </div>
          <div className="mt-2.5">
            <div className="grid grid-cols-2 gap-2 font-mono">
              {/* LEFT Directional Signal */}
              <div className="bg-defense-950/80 p-2.5 rounded border border-defense-800">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-bold text-rose-400">LEFT SIGNAL</span>
                  <span className={`px-1 rounded text-[9px] font-bold ${azimLeftStatus === 'NORMAL' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                    {azimLeftStatus === 'NORMAL' ? '25-40V OK' : 'WARNING'}
                  </span>
                </div>
                <div className="text-xl font-bold text-slate-100 mt-1">
                  {azimLeftVal.toFixed(2)}{' '}
                  <span className="text-xs font-normal text-slate-400">V</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Directional: LEFT</div>
              </div>

              {/* RIGHT Directional Signal */}
              <div className="bg-defense-950/80 p-2.5 rounded border border-defense-800">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-bold text-indigo-400">RIGHT SIGNAL</span>
                  <span className={`px-1 rounded text-[9px] font-bold ${azimRightStatus === 'NORMAL' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                    {azimRightStatus === 'NORMAL' ? '25-40V OK' : 'WARNING'}
                  </span>
                </div>
                <div className="text-xl font-bold text-slate-100 mt-1">
                  {azimRightVal.toFixed(2)}{' '}
                  <span className="text-xs font-normal text-slate-400">V</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Directional: RIGHT</div>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 mt-2 flex justify-between">
              <span>Band: 25.0 – 40.0 V (IDEAL)</span>
              <span className="text-emerald-400">
                Motor: {azimuthData?.features.motor_voltage?.toFixed(2) || '34.00'} V
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Oscilloscope Telemetry Charts Grid - Exactly Reordered (1 to 6) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 1: Recoil Speed Sensor */}
        <div className="bg-defense-900 border border-defense-700/80 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3 font-mono text-xs">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-slate-200">1. RECOIL SPEED SENSOR STREAM (m/s)</span>
            </div>
            <span className="text-slate-400 text-[11px]">Stroke Time &lt; 0.20 s | Baseline: 1.85 m/s</span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyBuffer}>
                <CartesianGrid strokeDasharray="2 2" stroke="#1f2b45" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis domain={[1.0, 3.0]} stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ backgroundColor: '#0b101b', borderColor: '#1f2b45', fontSize: '11px', fontFamily: 'monospace' }} />
                <ReferenceLine y={1.85} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Baseline 1.85', fill: '#10b981', fontSize: 10 }} />
                <Line type="monotone" dataKey="recoil_speed" stroke="#00f0ff" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Recoil Distance Stream */}
        <div className="bg-defense-900 border border-defense-700/80 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3 font-mono text-xs">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-slate-200">2. RECOIL DISTANCE STREAM (mm)</span>
            </div>
            <span className="text-slate-400 text-[11px]">Normal: 250-300 mm | Warning: 300 mm | Critical: 350 mm</span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyBuffer}>
                <CartesianGrid strokeDasharray="2 2" stroke="#1f2b45" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis domain={[230, 390]} stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ backgroundColor: '#0b101b', borderColor: '#1f2b45', fontSize: '11px', fontFamily: 'monospace' }} />
                <ReferenceLine y={300} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Warning 300mm', fill: '#f59e0b', fontSize: 10 }} />
                <ReferenceLine y={350} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Critical 350mm', fill: '#ef4444', fontSize: 10 }} />
                <Line type="monotone" dataKey="recoil_distance" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: LRF Voltage */}
        <div className="bg-defense-900 border border-defense-700/80 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3 font-mono text-xs">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-slate-200">3. LRF DETECTOR VOLTAGE STREAM (V)</span>
            </div>
            <span className="text-slate-400 text-[11px]">Normal: 11.0 – 12.0 V</span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyBuffer}>
                <CartesianGrid strokeDasharray="2 2" stroke="#1f2b45" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis domain={[8.5, 13.5]} stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ backgroundColor: '#0b101b', borderColor: '#1f2b45', fontSize: '11px', fontFamily: 'monospace' }} />
                <ReferenceLine y={9.5} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Alert <9.5V', fill: '#ef4444', fontSize: 10 }} />
                <ReferenceLine y={10.75} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Nominal 10.75V', fill: '#10b981', fontSize: 10 }} />
                <ReferenceLine y={12.0} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Critical >12.0V', fill: '#ef4444', fontSize: 10 }} />
                <Line type="monotone" dataKey="lrf_voltage" stroke="#00f0ff" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: ALG Circuit Checking & Switches */}
        <div className="bg-defense-900 border border-defense-700/80 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3 font-mono text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span className="font-bold text-slate-200">4. ALG CIRCUIT SERVICEABILITY &amp; SWITCHES</span>
            </div>
            <span className="text-slate-400 text-[11px]">K1(Fwd), K2(Rev), K3(Fwd), K4(Rev)</span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyBuffer}>
                <CartesianGrid strokeDasharray="2 2" stroke="#1f2b45" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis domain={[0, 1.2]} stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ backgroundColor: '#0b101b', borderColor: '#1f2b45', fontSize: '11px', fontFamily: 'monospace' }} />
                <ReferenceLine y={1.0} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Active (1)', fill: '#10b981', fontSize: 10 }} />
                <Line type="stepAfter" dataKey="alg_circuit" stroke="#a855f7" strokeWidth={2} dot={false} isAnimationActive={false} name="Loop Continuity" />
                <Line type="stepAfter" dataKey="k1_forward" stroke="#10b981" strokeWidth={1.5} dot={false} isAnimationActive={false} name="K1 Fwd" />
                <Line type="stepAfter" dataKey="k2_reverse" stroke="#38bdf8" strokeWidth={1.5} dot={false} isAnimationActive={false} name="K2 Rev" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 5: Elevation Voltage Sensor - Independent UP & DOWN */}
        <div className="bg-defense-900 border border-defense-700/80 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3 font-mono text-xs">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-slate-200">5. ELEVATION VOLTAGE SENSOR STREAM (V)</span>
            </div>
            <span className="text-slate-400 text-[11px]"><span className="text-amber-400 font-semibold">● UP</span> | <span className="text-sky-400 font-semibold">● DOWN</span> (25–40 V)</span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyBuffer}>
                <CartesianGrid strokeDasharray="2 2" stroke="#1f2b45" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis domain={[15, 45]} stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ backgroundColor: '#0b101b', borderColor: '#1f2b45', fontSize: '11px', fontFamily: 'monospace' }} />
                <ReferenceLine y={25.0} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Min 25V', fill: '#10b981', fontSize: 10 }} />
                <ReferenceLine y={32.5} stroke="#00f0ff" strokeDasharray="3 3" label={{ value: 'Nominal 32.5V', fill: '#00f0ff', fontSize: 10 }} />
                <ReferenceLine y={40.0} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Max 40V', fill: '#10b981', fontSize: 10 }} />
                <Line type="monotone" dataKey="elevation_up_voltage" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} name="Elevation UP" />
                <Line type="monotone" dataKey="elevation_down_voltage" stroke="#38bdf8" strokeWidth={2} dot={false} isAnimationActive={false} name="Elevation DOWN" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 6: Azimuth Voltage Sensor - Independent LEFT & RIGHT */}
        <div className="bg-defense-900 border border-defense-700/80 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3 font-mono text-xs">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-rose-400" />
              <span className="font-bold text-slate-200">6. AZIMUTH DIRECTIONAL SENSOR STREAM (V)</span>
            </div>
            <span className="text-slate-400 text-[11px]"><span className="text-rose-400 font-semibold">● LEFT</span> | <span className="text-indigo-400 font-semibold">● RIGHT</span> (25–40 V)</span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyBuffer}>
                <CartesianGrid strokeDasharray="2 2" stroke="#1f2b45" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis domain={[15, 45]} stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ backgroundColor: '#0b101b', borderColor: '#1f2b45', fontSize: '11px', fontFamily: 'monospace' }} />
                <ReferenceLine y={25.0} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Min 25V', fill: '#10b981', fontSize: 10 }} />
                <ReferenceLine y={33.5} stroke="#00f0ff" strokeDasharray="3 3" label={{ value: 'Nominal 33.5V', fill: '#00f0ff', fontSize: 10 }} />
                <ReferenceLine y={40.0} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Max 40V', fill: '#10b981', fontSize: 10 }} />
                <Line type="monotone" dataKey="azimuth_left_signal" stroke="#fb7185" strokeWidth={2} dot={false} isAnimationActive={false} name="Azimuth LEFT" />
                <Line type="monotone" dataKey="azimuth_right_signal" stroke="#818cf8" strokeWidth={2} dot={false} isAnimationActive={false} name="Azimuth RIGHT" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
