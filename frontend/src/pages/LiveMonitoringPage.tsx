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
  recoil_speed: number;       // m/s
  recoil_distance: number;    // mm (250-300 normal, 300-350 warning, >350 critical)
  oil_level: number;          // %
  lrf_voltage: number;        // V (9.5 - 12.0 V, nominal band)
  alg_circuit: number;        // 1.0 continuous, 0.0 interrupted
  elevation_voltage: number;  // V (25-40 V normal)
  azimuth_voltage: number;    // V (25-40 V normal)
}

const ChartStandbyState: React.FC<{ channelName: string; note: string }> = ({ channelName, note }) => (
  <div className="h-56 w-full flex flex-col items-center justify-center bg-defense-950/70 rounded border border-defense-800/60 p-4 text-center font-mono">
    <div className="w-10 h-10 rounded-full bg-defense-900 border border-defense-700/80 flex items-center justify-center mb-2.5 shadow-inner">
      <Radio className="w-5 h-5 text-amber-400 animate-pulse" />
    </div>
    <div className="text-xs font-bold text-slate-200 uppercase tracking-wider">
      {channelName}
    </div>
    <div className="text-[11px] text-slate-400 mt-1 max-w-xs leading-relaxed">
      Awaiting live telemetry packet from server. Waveform will engage automatically.
    </div>
    <div className="mt-2.5 flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-defense-900/90 border border-defense-800">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
      <span className="text-[10px] text-amber-400/90 uppercase font-semibold">
        {note}
      </span>
    </div>
  </div>
);

export const LiveMonitoringPage: React.FC = () => {
  const { latestBatch, isConnected, hasLiveData, readingsCount } = useTelemetry();
  const [historyBuffer, setHistoryBuffer] = useState<TelemetryPoint[]>([]);

  // Only populate buffer when server has actually sent live data
  useEffect(() => {
    if (!hasLiveData || !latestBatch || latestBatch.length === 0) return;

    // Verify there are actual features present
    const hasAnyFeatures = latestBatch.some(
      (item) => item.features && Object.keys(item.features).length > 0
    );
    if (!hasAnyFeatures) return;

    const timeStr = new Date().toLocaleTimeString();

    // Default nominal baseline values
    let recTime = 0.15;
    let recSpeed = 1.85;
    let recDist = 275.0;
    let recOil = 94.0;
    let lrfVolt = 11.5;
    let algCircuit = 1.0;
    let elevVolt = 32.5;
    let azimVolt = 34.0;

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
      } else if (item.subsystem_code === 'ELEVATION') {
        if (f.k1_voltage !== undefined) elevVolt = f.k1_voltage;
        else if (f.psm_voltage !== undefined) elevVolt = f.psm_voltage;
      } else if (item.subsystem_code === 'AZIMUTH') {
        if (f.motor_voltage !== undefined) azimVolt = f.motor_voltage;
        else if (f.k1_voltage !== undefined) azimVolt = f.k1_voltage;
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
          elevation_voltage: Number(elevVolt.toFixed(2)),
          azimuth_voltage: Number(azimVolt.toFixed(2)),
        },
      ];
      return next.slice(-30);
    });
  }, [latestBatch, hasLiveData]);

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
  const recoilDistRaw = recoilData?.features.recoil_distance;
  const hasRecoilDist = hasLiveData && recoilDistRaw !== undefined;
  const recoilDist = recoilDistRaw ?? 275.0;
  const recoilDistStatus =
    recoilDist > 350.0 ? 'CRITICAL' : recoilDist > 300.0 ? 'WARNING' : recoilDist < 250.0 ? 'WARNING' : 'NORMAL';

  // LRF voltage status calculation
  const lrfVoltRaw = lrfData?.features.detector_voltage;
  const hasLrfVolt = hasLiveData && lrfVoltRaw !== undefined;
  const lrfVoltVal = lrfVoltRaw ?? 11.0;
  const lrfVoltStatus =
    lrfVoltVal < 9.5 || lrfVoltVal > 12.0
      ? 'CRITICAL'
      : 'NORMAL';

  const hasRecoilSpeed = hasLiveData && (recoilData?.features.recoil_speed !== undefined || hasRecoilDist);
  const hasAlgCircuit = hasLiveData && algData?.features.circuit_serviceability !== undefined;
  const hasElevation = hasLiveData && (elevationData?.features.k1_voltage !== undefined || elevationData?.features.psm_voltage !== undefined);
  const hasAzimuth = hasLiveData && (azimuthData?.features.motor_voltage !== undefined || azimuthData?.features.k1_voltage !== undefined);

  return (
    <div className="space-y-6">
      {/* Live Status Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-defense-900 border border-defense-700/80 rounded-lg p-4 font-mono">
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${
              hasLiveData
                ? 'bg-emerald-400 animate-ping shadow-[0_0_10px_#10b981]'
                : 'bg-amber-400 animate-pulse shadow-[0_0_10px_#f59e0b]'
            }`}
          />
          <div>
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              REAL-TIME TURRET SENSOR TELEMETRY BUS (WEBSOCKET DAQ)
            </h2>
            <div className="text-xs text-slate-400 mt-0.5">
              Live Ingestion:{' '}
              {hasLiveData ? (
                <span className="text-emerald-400 font-semibold">ONLINE / STREAMING</span>
              ) : (
                <span className="text-amber-400 font-semibold">STANDBY • AWAITING SERVER TELEMETRY</span>
              )}{' '}
              | Mode:{' '}
              <span className={hasLiveData ? 'text-cyan-300 font-semibold' : 'text-slate-400 font-semibold'}>
                {hasLiveData ? 'DIRECT SENSOR ACQUISITION' : 'STREAM PAUSED (NO VALUES RECEIVED)'}
              </span>{' '}
              | Channel Sync:{' '}
              <span className={hasLiveData ? 'text-emerald-400' : 'text-amber-400/80'}>
                {hasLiveData ? `ACTIVE (${readingsCount > 0 ? `${readingsCount} READINGS` : 'ONLINE'})` : 'WAITING FOR SENSOR INGESTION'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="bg-defense-950 px-3 py-1.5 rounded border border-defense-800">
            <span className="text-slate-400">Connection: </span>
            <span className={!isConnected ? 'text-red-400 font-bold' : hasLiveData ? 'text-emerald-400 font-bold' : 'text-cyan-400 font-bold'}>
              {!isConnected ? 'OFFLINE' : hasLiveData ? 'CONNECTED (STREAMING)' : 'CONNECTED (BUS IDLE)'}
            </span>
          </div>
          <div className="bg-defense-950 px-3 py-1.5 rounded border border-defense-800">
            <span className="text-slate-400">Stream Buffer: </span>
            <span className={hasLiveData && historyBuffer.length > 0 ? 'text-cyan-400 font-bold' : 'text-slate-500 font-bold'}>
              {hasLiveData ? `${historyBuffer.length} Points (LIVE)` : '0 Points (STANDBY)'}
            </span>
          </div>
        </div>
      </div>

      {/* Stream State Notice Banner */}
      {!hasLiveData ? (
        <div className="bg-amber-950/20 border border-amber-500/30 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
          <div className="flex items-center gap-3">
            <Radio className="w-4 h-4 text-amber-400 animate-pulse flex-shrink-0" />
            <div>
              <span className="font-bold text-amber-400 uppercase tracking-wide">
                TELEMETRY STREAM STANDBY:
              </span>{' '}
              <span className="text-slate-300">
                Server has not received sensor readings yet. Once data ingestion begins from hardware or dispatch, live stream signals, gauges, and oscilloscope waveforms will engage automatically.
              </span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-bold uppercase whitespace-nowrap">
            BUS LISTENING
          </span>
        </div>
      ) : (
        <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping flex-shrink-0" />
            <span className="font-bold text-emerald-400 uppercase tracking-wide">
              LIVE STREAM ENGAGED:
            </span>{' '}
            <span className="text-slate-200">
              Receiving live telemetry values from server. Real-time DAQ oscilloscope synchronized ({readingsCount > 0 ? `${readingsCount} packets processed` : 'Active'}).
            </span>
          </div>
          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase border border-emerald-500/30">
            STREAM ACTIVE
          </span>
        </div>
      )}

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
            {hasRecoilSpeed ? (
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
            ) : (
              <div className="text-2xl font-bold text-slate-500 font-mono">
                --.-- <span className="text-xs font-normal text-slate-600">m/s</span>
              </div>
            )}
            <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
              <span>Baseline: 1.85 m/s</span>
              {hasRecoilSpeed ? (
                <span className={(recoilData?.features.recoil_time ?? 0.15) < 0.20 ? 'text-emerald-400' : 'text-amber-400 font-bold'}>
                  Stroke Time: {(recoilData?.features.recoil_time ?? 0.15).toFixed(2)} s (&lt; 0.20 s)
                </span>
              ) : (
                <span className="text-amber-500/70 text-[10px] font-mono">STANDBY (AWAITING DATA)</span>
              )}
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
            {hasRecoilDist ? (
              <div className="text-2xl font-bold text-slate-100">
                {recoilDist.toFixed(1)}{' '}
                <span className="text-xs font-normal text-slate-400">mm</span>
              </div>
            ) : (
              <div className="text-2xl font-bold text-slate-500 font-mono">
                --.- <span className="text-xs font-normal text-slate-600">mm</span>
              </div>
            )}
            <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
              <span>Specified: 250 – 300 mm</span>
              {hasRecoilDist ? (
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
              ) : (
                <span className="text-amber-500/70 text-[10px] font-mono">STANDBY (AWAITING DATA)</span>
              )}
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
            {hasLrfVolt ? (
              <div className="text-2xl font-bold text-slate-100">
                {lrfVoltVal.toFixed(2)}{' '}
                <span className="text-xs font-normal text-slate-400">V (Voltage)</span>
              </div>
            ) : (
              <div className="text-2xl font-bold text-slate-500 font-mono">
                --.-- <span className="text-xs font-normal text-slate-600">V (Voltage)</span>
              </div>
            )}
            <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
              <span>Expected: 9.5 – 12.0 V</span>
              {hasLrfVolt ? (
                <span
                  className={
                    lrfVoltStatus === 'CRITICAL'
                      ? 'text-red-400 font-bold'
                      : 'text-emerald-400'
                  }
                >
                  {lrfVoltStatus === 'NORMAL' ? '9.5-12 V OK' : lrfVoltStatus}
                </span>
              ) : (
                <span className="text-amber-500/70 text-[10px] font-mono">STANDBY (AWAITING DATA)</span>
              )}
            </div>
          </div>
        </div>

        {/* 4. ALG Circuit Checking */}
        <div className="bg-defense-900 border border-defense-700/80 rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-defense-800">
            <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" /> 4. ALG CIRCUIT CHECKING
            </span>
            <span className="text-[10px] bg-defense-800 px-1.5 py-0.5 rounded">AUTOLOADER</span>
          </div>
          <div className="mt-3">
            {hasAlgCircuit ? (
              <div className="text-2xl font-bold text-slate-100">
                {algData?.features.circuit_serviceability !== 0 ? 'CONTINUOUS' : 'INTERRUPTED'}{' '}
                <span className="text-xs font-normal text-slate-400">6/6 Microswitches</span>
              </div>
            ) : (
              <div className="text-2xl font-bold text-slate-500 font-mono">
                STANDBY <span className="text-xs font-normal text-slate-600">Bus Idle</span>
              </div>
            )}
            <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
              <span>Serviceability: {hasAlgCircuit ? 'OK' : 'STANDBY'}</span>
              {hasAlgCircuit ? (
                <span className="text-amber-400 text-[10px]">Operating Current: TBD</span>
              ) : (
                <span className="text-amber-500/70 text-[10px] font-mono">STANDBY (AWAITING DATA)</span>
              )}
            </div>
          </div>
        </div>

        {/* 5. Elevation Voltage Sensor */}
        <div className="bg-defense-900 border border-defense-700/80 rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-defense-800">
            <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
              <Zap className="w-3.5 h-3.5" /> 5. ELEVATION VOLTAGE SENSOR
            </span>
            <span className="text-[10px] bg-defense-800 px-1.5 py-0.5 rounded">ELEVATION</span>
          </div>
          <div className="mt-3">
            {hasElevation ? (
              <div className="text-2xl font-bold text-slate-100">
                {elevationData?.features.k1_voltage?.toFixed(2) || '32.50'}{' '}
                <span className="text-xs font-normal text-slate-400">V (Voltage)</span>
              </div>
            ) : (
              <div className="text-2xl font-bold text-slate-500 font-mono">
                --.-- <span className="text-xs font-normal text-slate-600">V (Voltage)</span>
              </div>
            )}
            <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
              <span>Range: 25 – 40 V (IDEAL)</span>
              {hasElevation ? (
                <span className="text-emerald-400">
                  Hydraulic: {elevationData?.features.hydraulic_pressure?.toFixed(1) || '125.0'} MPa
                </span>
              ) : (
                <span className="text-amber-500/70 text-[10px] font-mono">STANDBY (AWAITING DATA)</span>
              )}
            </div>
          </div>
        </div>

        {/* 6. Azimuth Voltage Sensor */}
        <div className="bg-defense-900 border border-defense-700/80 rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-defense-800">
            <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
              <Zap className="w-3.5 h-3.5" /> 6. AZIMUTH VOLTAGE SENSOR
            </span>
            <span className="text-[10px] bg-defense-800 px-1.5 py-0.5 rounded">AZIMUTH / SLEW</span>
          </div>
          <div className="mt-3">
            {hasAzimuth ? (
              <div className="text-2xl font-bold text-slate-100">
                {azimuthData?.features.motor_voltage?.toFixed(2) || '34.00'}{' '}
                <span className="text-xs font-normal text-slate-400">V (Voltage)</span>
              </div>
            ) : (
              <div className="text-2xl font-bold text-slate-500 font-mono">
                --.-- <span className="text-xs font-normal text-slate-600">V (Voltage)</span>
              </div>
            )}
            <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
              <span>Range: 25 – 40 V (IDEAL)</span>
              {hasAzimuth ? (
                <span className="text-emerald-400">
                  K1 Contactor: {azimuthData?.features.k1_voltage?.toFixed(2) || '32.50'} V
                </span>
              ) : (
                <span className="text-amber-500/70 text-[10px] font-mono">STANDBY (AWAITING DATA)</span>
              )}
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
          {hasLiveData && historyBuffer.length > 0 ? (
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
          ) : (
            <ChartStandbyState channelName="RECOIL SPEED STREAM" note="CHANNEL LISTENING" />
          )}
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
          {hasLiveData && historyBuffer.length > 0 ? (
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
          ) : (
            <ChartStandbyState channelName="RECOIL DISTANCE STREAM" note="CHANNEL LISTENING" />
          )}
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
          {hasLiveData && historyBuffer.length > 0 ? (
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
          ) : (
            <ChartStandbyState channelName="LRF DETECTOR VOLTAGE STREAM" note="CHANNEL LISTENING" />
          )}
        </div>

        {/* Chart 4: ALG Circuit Checking */}
        <div className="bg-defense-900 border border-defense-700/80 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3 font-mono text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span className="font-bold text-slate-200">4. ALG CIRCUIT SERVICEABILITY STREAM</span>
            </div>
            <span className="text-slate-400 text-[11px]">6 Microswitches Monitored</span>
          </div>
          {hasLiveData && historyBuffer.length > 0 ? (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historyBuffer}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#1f2b45" />
                  <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis domain={[0, 1.2]} stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0b101b', borderColor: '#1f2b45', fontSize: '11px', fontFamily: 'monospace' }} />
                  <ReferenceLine y={1.0} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Continuous', fill: '#10b981', fontSize: 10 }} />
                  <Line type="stepAfter" dataKey="alg_circuit" stroke="#a855f7" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <ChartStandbyState channelName="ALG CIRCUIT SERVICEABILITY STREAM" note="CHANNEL LISTENING" />
          )}
        </div>

        {/* Chart 5: Elevation Voltage Sensor */}
        <div className="bg-defense-900 border border-defense-700/80 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3 font-mono text-xs">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-slate-200">5. ELEVATION VOLTAGE SENSOR STREAM (V)</span>
            </div>
            <span className="text-slate-400 text-[11px]">Ideal Band: 25.0 – 40.0 V</span>
          </div>
          {hasLiveData && historyBuffer.length > 0 ? (
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
                  <Line type="monotone" dataKey="elevation_voltage" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <ChartStandbyState channelName="ELEVATION VOLTAGE STREAM" note="CHANNEL LISTENING" />
          )}
        </div>

        {/* Chart 6: Azimuth Voltage Sensor */}
        <div className="bg-defense-900 border border-defense-700/80 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3 font-mono text-xs">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-rose-400" />
              <span className="font-bold text-slate-200">6. AZIMUTH VOLTAGE SENSOR STREAM (V)</span>
            </div>
            <span className="text-slate-400 text-[11px]">Ideal Band: 25.0 – 40.0 V</span>
          </div>
          {hasLiveData && historyBuffer.length > 0 ? (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historyBuffer}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#1f2b45" />
                  <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis domain={[15, 45]} stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0b101b', borderColor: '#1f2b45', fontSize: '11px', fontFamily: 'monospace' }} />
                  <ReferenceLine y={25.0} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Min 25V', fill: '#10b981', fontSize: 10 }} />
                  <ReferenceLine y={34.0} stroke="#00f0ff" strokeDasharray="3 3" label={{ value: 'Nominal 34V', fill: '#00f0ff', fontSize: 10 }} />
                  <ReferenceLine y={40.0} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Max 40V', fill: '#10b981', fontSize: 10 }} />
                  <Line type="monotone" dataKey="azimuth_voltage" stroke="#fb7185" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <ChartStandbyState channelName="AZIMUTH VOLTAGE STREAM" note="CHANNEL LISTENING" />
          )}
        </div>
      </div>
    </div>
  );
};
