import React from 'react';
import { Subsystem } from '../../types';
import { StatusBadge } from './StatusBadge';
import { useTelemetry } from '../../context/TelemetryContext';
import {
  TrendingDown,
  Minus,
  ArrowRight,
} from 'lucide-react';

export interface TechnicalSubItem {
  id: string;
  code: string;
  title: string;
  parameter: string;
  value: string | number;
  unit: string;
  range: string;
  status: 'NORMAL' | 'WARNING' | 'CRITICAL';
  statusDetails: string;
  details: string;
  subSwitches?: {
    code: string;
    name: string;
    status: string;
    threshold: string;
  }[];
}

export const getSubsystemTechnicalItems = (
  subsystemCode: string,
  features?: Record<string, number>
): TechnicalSubItem[] => {
  switch (subsystemCode) {
    case 'LRF': {
      const v = features?.detector_voltage ?? features?.voltage;
      const vStr = v !== undefined ? v.toFixed(2) : '11.00';
      let vStatus: 'NORMAL' | 'WARNING' | 'CRITICAL' = 'NORMAL';
      if (v !== undefined) {
        if (v < 9.5 || v > 12.0) vStatus = 'CRITICAL';
        else vStatus = 'NORMAL';
      }

      const opt = features?.optical_alignment ?? features?.optical_module_health;
      const optStr = opt !== undefined ? opt.toFixed(1) : '99.2';
      const optStatus: 'NORMAL' | 'WARNING' | 'CRITICAL' = opt !== undefined && opt < 95.0 ? 'WARNING' : 'NORMAL';

      const bite = features?.bite_status ?? features?.bite_self_test;
      const biteStr = bite !== undefined ? (bite >= 1.0 ? 'PASSED' : 'FAILED') : 'PASSED';
      const biteStatus: 'NORMAL' | 'WARNING' | 'CRITICAL' = bite !== undefined && bite < 1.0 ? 'CRITICAL' : 'NORMAL';

      return [
        {
          id: '1.1',
          code: '1.1',
          title: 'LRF Detector Voltage Check',
          parameter: 'Detector Supply Voltage',
          value: vStr,
          unit: 'V',
          range: '9.5 – 12.0 V (Nominal Band)',
          status: vStatus,
          statusDetails: 'Below 9.5V = ALERT | 9.5-12.0V = NORMAL/FUNCTIONING | Above 12.0V = CRITICAL ALERT',
          details: 'Monitors the electrical detector voltage for the Laser Range Finder. Displayed strictly in Volts (V), not Amps.',
        },
        {
          id: '1.2',
          code: '1.2',
          title: 'Optical Module Transmitter / Receiver Status',
          parameter: 'Beam Collimation & Reception Health',
          value: optStr,
          unit: '%',
          range: '> 95.0 % Operational',
          status: optStatus,
          statusDetails: 'Optoelectronic transmission efficiency and optical receiver sensitivity.',
          details: 'Continuous monitoring of laser transmitter diode path and receiver avalanche photodiode.',
        },
        {
          id: '1.3',
          code: '1.3',
          title: 'Range Measurement BITE Self-Test',
          parameter: 'Built-in Test Counter Evaluation',
          value: biteStr,
          unit: 'STATE',
          range: 'PASSED / VERIFIED',
          status: biteStatus,
          statusDetails: 'Internal digital range counter calibration and pulse timing verification.',
          details: 'Automated self-test confirming pulse chronometer resolution and optical threshold discriminator response.',
        },
      ];
    }

    case 'ALG': {
      const circ = features?.circuit_serviceability;
      const circStr = circ !== undefined ? (circ >= 1.0 ? 'ACTIVE / CONTINUOUS' : 'INTERRUPTED / OPEN') : 'ACTIVE / CONTINUOUS';
      const circStatus: 'NORMAL' | 'WARNING' | 'CRITICAL' = circ !== undefined && circ < 1.0 ? 'CRITICAL' : 'NORMAL';

      const switches = [
        { code: '2.2.1', name: 'RC Microswitch', val: features?.rc_microswitch ?? 1.0 },
        { code: '2.2.2', name: 'CLM Microswitch', val: features?.clm_microswitch ?? 1.0 },
        { code: '2.2.3', name: 'Rammer Microswitch', val: features?.rammer_microswitch ?? 1.0 },
        { code: '2.2.4', name: 'CBDM Microswitch', val: features?.cbdm_microswitch ?? 1.0 },
        { code: '2.2.5', name: 'CBDD Microswitch', val: features?.cbdd_microswitch ?? 1.0 },
        { code: '2.2.6', name: 'Gun Motor Lock Microswitch', val: features?.gun_motor_lock ?? 1.0 },
      ];
      const verifiedCount = switches.filter((s) => s.val >= 1.0).length;
      const switchStatus: 'NORMAL' | 'WARNING' | 'CRITICAL' = verifiedCount < 6 ? 'WARNING' : 'NORMAL';

      return [
        {
          id: '2.1',
          code: '2.1',
          title: 'Circuit Serviceability Check',
          parameter: 'Circuit Continuity & Current Path',
          value: circStr,
          unit: 'STATE',
          range: 'Closed Loop Continuity',
          status: circStatus,
          statusDetails: 'Circuit serviceability logic verifies current passes through microswitch circuits when actuated.',
          details: 'Validates electrical integrity of the automatic loader sequencing bus.',
        },
        {
          id: '2.2',
          code: '2.2',
          title: 'Microswitch Operation Check (6 Switches)',
          parameter: 'Microswitch Current & Contact State',
          value: `${verifiedCount}/6 VERIFIED`,
          unit: 'SWITCHES',
          range: 'Operating Current: Configurable / TBD',
          status: switchStatus,
          statusDetails: 'All 6 microswitches operational. Current thresholds marked as TBD / Configurable.',
          details: 'Inspects operating status across all 6 automatic loader microswitch positions.',
          subSwitches: switches.map((s) => ({
            code: s.code,
            name: s.name,
            status: s.val >= 1.0 ? 'CLOSED / CONTINUOUS' : 'OPEN / FAULT',
            threshold: 'TBD (Configurable)',
          })),
        },
      ];
    }

    case 'RECOIL': {
      const dist = features?.recoil_distance;
      const distStr = dist !== undefined ? dist.toFixed(1) : '275.0';
      let distStatus: 'NORMAL' | 'WARNING' | 'CRITICAL' = 'NORMAL';
      if (dist !== undefined) {
        if (dist > 350.0) distStatus = 'CRITICAL';
        else if (dist > 300.0) distStatus = 'WARNING';
      }

      const spd = features?.recoil_speed;
      const spdStr = spd !== undefined ? spd.toFixed(2) : '1.85';
      const spdStatus: 'NORMAL' | 'WARNING' | 'CRITICAL' =
        spd !== undefined && (spd < 1.5 || spd > 2.2) ? 'WARNING' : 'NORMAL';

      const time = features?.recoil_time;
      const timeStr = time !== undefined ? time.toFixed(2) : '0.32';
      const timeStatus: 'NORMAL' | 'WARNING' | 'CRITICAL' =
        time !== undefined && (time < 0.28 || time > 0.38) ? 'WARNING' : 'NORMAL';

      const oil = features?.oil_level;
      const oilStr = oil !== undefined ? oil.toFixed(1) : '94.0';
      let oilStatus: 'NORMAL' | 'WARNING' | 'CRITICAL' = 'NORMAL';
      if (oil !== undefined) {
        if (oil < 85.0) oilStatus = 'CRITICAL';
        else if (oil < 90.0) oilStatus = 'WARNING';
      }

      return [
        {
          id: '3.1',
          code: '3.1',
          title: 'Recoil Distance Reading',
          parameter: 'Buffer Stroke Travel',
          value: distStr,
          unit: 'mm',
          range: '250 – 300 mm = NORMAL',
          status: distStatus,
          statusDetails: '250-300 mm = NORMAL | 300-350 mm = WARNING | Above 350 mm = CRITICAL ALERT | <250 mm = Out of Range Safe',
          details: 'Stroke distance of the recoil buffer cylinder measured in millimetres (mm). Critical threshold at >350 mm indicates buffer bottoming-out risk.',
        },
        {
          id: '3.2',
          code: '3.2',
          title: 'Recoil Speed Reading',
          parameter: 'Recoil Motion Speed',
          value: spdStr,
          unit: 'm/s',
          range: '1.50 – 2.20 m/s',
          status: spdStatus,
          statusDetails: 'Recoil velocity measured through displacement rate tracking.',
          details: 'Evaluates fluid orifice throttling and damper rod damping resistance.',
        },
        {
          id: '3.3',
          code: '3.3',
          title: 'Recoil Time Reading',
          parameter: 'Cycle Duration Time',
          value: timeStr,
          unit: 's',
          range: '0.28 – 0.38 s',
          status: timeStatus,
          statusDetails: 'Recoil stroke return time in seconds.',
          details: 'Verifies pneumatic recuperator counter-pressure and return spring cycle completion.',
        },
        {
          id: '3.4',
          code: '3.4',
          title: 'Recoil Oil Level',
          parameter: 'Hydraulic Buffer Reservoir',
          value: oilStr,
          unit: '%',
          range: '> 85.0 % (Nominal: 90 - 100%)',
          status: oilStatus,
          statusDetails: 'Hydraulic fluid reservoir percentage in recoil damper accumulator.',
          details: 'Ensures adequate fluid charge to prevent aeration, cavitation, and thermal seal degradation.',
        },
      ];
    }

    case 'ELEVATION': {
      const k1 = features?.k1_voltage;
      const k1Str = k1 !== undefined ? k1.toFixed(1) : '32.5';
      const k1Status: 'NORMAL' | 'WARNING' | 'CRITICAL' =
        k1 !== undefined && (k1 < 25.0 || k1 > 40.0) ? 'WARNING' : 'NORMAL';

      const psm = features?.psm_voltage;
      const psmStr = psm !== undefined ? psm.toFixed(1) : '33.0';
      const psmStatus: 'NORMAL' | 'WARNING' | 'CRITICAL' =
        psm !== undefined && (psm < 25.0 || psm > 40.0) ? 'WARNING' : 'NORMAL';

      const press = features?.hydraulic_pressure;
      const pressStr = press !== undefined ? press.toFixed(1) : '125.0';
      const pressStatus: 'NORMAL' | 'WARNING' | 'CRITICAL' =
        press !== undefined && (press < 10.0 || press > 200.0) ? 'WARNING' : 'NORMAL';

      return [
        {
          id: '4.1',
          code: '4.1',
          title: 'K1 Voltage Check',
          parameter: 'K1 Elevation Contactor Voltage',
          value: k1Str,
          unit: 'V',
          range: '25 – 40 V = IDEAL / NORMAL',
          status: k1Status,
          statusDetails: '25-40 V = IDEAL / NORMAL. Displayed strictly in Volts (V), not Amps.',
          details: 'Primary electrical relay K1 coil and bus supply voltage for elevation drive control.',
        },
        {
          id: '4.2',
          code: '4.2',
          title: 'Power Supply Mount Voltage Check',
          parameter: 'PSM Regulated Bus Voltage',
          value: psmStr,
          unit: 'V',
          range: '25 – 40 V = IDEAL / NORMAL',
          status: psmStatus,
          statusDetails: '25-40 V = IDEAL / NORMAL. Displayed strictly in Volts (V), not Amps.',
          details: 'Electrical voltage delivery from the elevation power supply mount assembly.',
        },
        {
          id: '4.3',
          code: '4.3',
          title: 'Actuating Cylinder Hydraulic Fluid Pressure',
          parameter: 'Elevation Cylinder Pressure',
          value: pressStr,
          unit: 'MPa',
          range: '10 – 200 MPa = NORMAL',
          status: pressStatus,
          statusDetails: '10 - 200 MPa = NORMAL. Displayed in MPa.',
          details: 'Operating hydraulic fluid pressure in the elevation actuating cylinder powering gun trunnion movement.',
        },
      ];
    }

    case 'AZIMUTH': {
      const k1 = features?.k1_voltage;
      const k1Str = k1 !== undefined ? k1.toFixed(1) : '32.5';
      const k1Status: 'NORMAL' | 'WARNING' | 'CRITICAL' =
        k1 !== undefined && (k1 < 25.0 || k1 > 40.0) ? 'WARNING' : 'NORMAL';

      const mp9 = features?.mp9_voltage;
      const mp9Str = mp9 !== undefined ? mp9.toFixed(1) : '31.8';
      const mp9Status: 'NORMAL' | 'WARNING' | 'CRITICAL' =
        mp9 !== undefined && (mp9 < 25.0 || mp9 > 40.0) ? 'WARNING' : 'NORMAL';

      const motor = features?.motor_voltage;
      const motorStr = motor !== undefined ? motor.toFixed(1) : '34.0';
      const motorStatus: 'NORMAL' | 'WARNING' | 'CRITICAL' =
        motor !== undefined && (motor < 25.0 || motor > 40.0) ? 'WARNING' : 'NORMAL';

      return [
        {
          id: '5.1',
          code: '5.1',
          title: 'K1 Voltage Check',
          parameter: 'K1 Azimuth Contactor Voltage',
          value: k1Str,
          unit: 'V',
          range: '25 – 40 V = IDEAL / NORMAL',
          status: k1Status,
          statusDetails: '25-40 V = IDEAL / NORMAL. Displayed strictly in Volts (V), not Amps.',
          details: 'Electrical voltage reading across the K1 azimuth slew drive contactor.',
        },
        {
          id: '5.2',
          code: '5.2',
          title: 'MP9 Voltage Check',
          parameter: 'MP9 Distribution Rail Voltage',
          value: mp9Str,
          unit: 'V',
          range: '25 – 40 V = IDEAL / NORMAL',
          status: mp9Status,
          statusDetails: '25-40 V = IDEAL / NORMAL. Displayed strictly in Volts (V), not Amps.',
          details: 'Auxiliary electrical distribution rail MP9 voltage for turret rotation electronics.',
        },
        {
          id: '5.3',
          code: '5.3',
          title: 'Actuating Motor Voltage Check',
          parameter: 'Azimuth Drive Motor Voltage',
          value: motorStr,
          unit: 'V',
          range: '25 – 40 V = IDEAL / NORMAL',
          status: motorStatus,
          statusDetails: '25-40 V = IDEAL / NORMAL. Displayed strictly in Volts (V), not Amps.',
          details: 'Terminal electrical voltage supplied to the high-torque azimuth slew drive motor.',
        },
      ];
    }

    default:
      return [];
  }
};

interface SubsystemCardProps {
  subsystem: Subsystem;
  onDrillDown: (id: string) => void;
  initiallyExpanded?: boolean;
}

export const SubsystemCard: React.FC<SubsystemCardProps> = ({
  subsystem,
  onDrillDown,
}) => {
  const { latestBatch } = useTelemetry();
  const liveBatchItem = latestBatch.find(
    (b) => b.subsystem_code === subsystem.code || b.subsystem_id === subsystem.id
  );
  const activeFeatures = {
    ...(subsystem.latest_features || {}),
    ...(liveBatchItem?.features || {}),
  };

  const hi = liveBatchItem?.health_index ?? subsystem.current_health_index;
  const statusBand = liveBatchItem?.status_band ?? subsystem.status_band ?? 'HEALTHY';
  const isHealthy = hi >= 75;
  const isDegrading = hi >= 50 && hi < 75;
  const isSevere = hi < 50;

  const scoreColor = isHealthy
    ? 'text-emerald-400'
    : isDegrading
    ? 'text-amber-400'
    : 'text-red-400';

  const strokeColor = isHealthy ? '#10b981' : isDegrading ? '#f59e0b' : '#ef4444';

  const subItems = getSubsystemTechnicalItems(subsystem.code, activeFeatures);

  return (
    <div className="bg-defense-900 border border-defense-700/80 rounded-lg p-4 flex flex-col justify-between hover:border-cyan-500/50 transition-all shadow-sm">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-[10px] font-mono tracking-wider text-slate-400 uppercase">
              {subsystem.category}
            </div>
            <h3 className="font-semibold text-slate-100 text-sm mt-0.5">{subsystem.name}</h3>
          </div>
          <StatusBadge status={statusBand} size="sm" />
        </div>

        {/* Health Score Gauge Display */}
        <div className="flex items-baseline justify-between mt-4">
          <div>
            <div className="text-[11px] font-mono text-slate-400 uppercase">Health Index</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-3xl font-mono font-bold ${scoreColor}`}>
                {hi.toFixed(1)}%
              </span>
              <div className="flex items-center text-xs font-mono">
                {subsystem.trend_direction === 'DEGRADING' ? (
                  <span className="flex items-center text-amber-400 gap-0.5">
                    <TrendingDown className="w-3.5 h-3.5" /> Degr
                  </span>
                ) : (
                  <span className="flex items-center text-emerald-400 gap-0.5">
                    <Minus className="w-3.5 h-3.5" /> Stable
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-24 h-2 bg-defense-800 rounded-full overflow-hidden self-center border border-defense-700">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, hi))}%`, backgroundColor: strokeColor }}
            />
          </div>
        </div>

        {/* Metadata stats */}
        <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-defense-800 text-xs font-mono text-slate-400">
          <div>
            <span className="text-[10px] text-slate-400 uppercase block">Hours:</span>
            <span className="text-slate-200">{subsystem.operating_hours.toFixed(1)} hrs</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase block">Active Alerts:</span>
            <span className={subsystem.active_alert_count ? 'text-red-400 font-bold' : 'text-slate-300'}>
              {subsystem.active_alert_count || 0}
            </span>
          </div>
        </div>

        {/* Live Primary Telemetry Metric Preview */}
        {subItems.length > 0 && (
          <div className="mt-3 p-2 rounded bg-defense-950/80 border border-defense-800 text-xs font-mono flex items-center justify-between">
            <span className="text-slate-400 text-[11px] truncate max-w-[170px]">
              {subItems[0].parameter}:
            </span>
            <span
              className={`font-bold text-xs px-2 py-0.5 rounded border ${
                subItems[0].status === 'CRITICAL'
                  ? 'text-red-400 bg-red-950/50 border-red-800'
                  : subItems[0].status === 'WARNING'
                  ? 'text-amber-400 bg-amber-950/50 border-amber-800'
                  : 'text-cyan-300 bg-defense-900 border-defense-800'
              }`}
            >
              {subItems[0].value} {subItems[0].unit !== 'STATE' && subItems[0].unit !== 'SWITCHES' ? subItems[0].unit : ''}
            </span>
          </div>
        )}
      </div>

      {/* Drill-down action */}
      <button
        onClick={() => onDrillDown(subsystem.id)}
        className="mt-4 w-full flex items-center justify-center gap-1.5 py-1.5 rounded bg-defense-800 hover:bg-cyan-950 hover:text-cyan-300 text-slate-300 font-mono text-xs border border-defense-700 hover:border-cyan-700 transition-colors"
      >
        <span>Telemetry Drill-Down</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
