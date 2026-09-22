import React, { useState } from 'react';
import { Subsystem } from '../../types';
import { StatusBadge } from './StatusBadge';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Eye,
  CheckCircle2,
  AlertCircle,
  X,
  Gauge,
  Sliders,
  ShieldCheck,
  Zap,
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

export const getSubsystemTechnicalItems = (subsystemCode: string): TechnicalSubItem[] => {
  switch (subsystemCode) {
    case 'LRF':
      return [
        {
          id: '1.1',
          code: '1.1',
          title: 'LRF Detector Voltage Check',
          parameter: 'Detector Supply Voltage',
          value: '11.5',
          unit: 'V',
          range: '10.5 – 12.5 V (Nominal: 11.0 – 12.0 V)',
          status: 'NORMAL',
          statusDetails: 'Below 10.5V = ALERT | 10.5-11.0V = WARNING | 11.0-12.0V = OK/FUNCTIONING | 12.0-12.5V = WARNING | Above 12.5V = CRITICAL ALERT',
          details: 'Monitors the electrical detector voltage for the Laser Range Finder. Displayed strictly in Volts (V), not Amps.',
        },
        {
          id: '1.2',
          code: '1.2',
          title: 'Optical Module Transmitter / Receiver Status',
          parameter: 'Beam Collimation & Reception Health',
          value: '99.2',
          unit: '%',
          range: '> 95.0 % Operational',
          status: 'NORMAL',
          statusDetails: 'Optoelectronic transmission efficiency and optical receiver sensitivity.',
          details: 'Continuous monitoring of laser transmitter diode path and receiver avalanche photodiode.',
        },
        {
          id: '1.3',
          code: '1.3',
          title: 'Range Measurement BITE Self-Test',
          parameter: 'Built-in Test Counter Evaluation',
          value: 'PASSED',
          unit: 'STATE',
          range: 'PASSED / VERIFIED',
          status: 'NORMAL',
          statusDetails: 'Internal digital range counter calibration and pulse timing verification.',
          details: 'Automated self-test confirming pulse chronometer resolution and optical threshold discriminator response.',
        },
      ];

    case 'ALG':
      return [
        {
          id: '2.1',
          code: '2.1',
          title: 'Circuit Serviceability Check',
          parameter: 'Circuit Continuity & Current Path',
          value: 'ACTIVE / CONTINUOUS',
          unit: 'STATE',
          range: 'Closed Loop Continuity',
          status: 'NORMAL',
          statusDetails: 'Circuit serviceability logic verifies current passes through microswitch circuits when actuated.',
          details: 'Validates electrical integrity of the automatic loader sequencing bus.',
        },
        {
          id: '2.2',
          code: '2.2',
          title: 'Microswitch Operation Check (6 Switches)',
          parameter: 'Microswitch Current & Contact State',
          value: '6/6 VERIFIED',
          unit: 'SWITCHES',
          range: 'Operating Current: Configurable / TBD',
          status: 'NORMAL',
          statusDetails: 'All 6 microswitches operational. Current thresholds marked as TBD / Configurable.',
          details: 'Inspects operating status across all 6 automatic loader microswitch positions.',
          subSwitches: [
            { code: '2.2.1', name: 'RC Microswitch', status: 'CLOSED / CONTINUOUS', threshold: 'TBD (Configurable)' },
            { code: '2.2.2', name: 'CLM Microswitch', status: 'CLOSED / CONTINUOUS', threshold: 'TBD (Configurable)' },
            { code: '2.2.3', name: 'Rammer Microswitch', status: 'CLOSED / CONTINUOUS', threshold: 'TBD (Configurable)' },
            { code: '2.2.4', name: 'CBDM Microswitch', status: 'CLOSED / CONTINUOUS', threshold: 'TBD (Configurable)' },
            { code: '2.2.5', name: 'CBDD Microswitch', status: 'CLOSED / CONTINUOUS', threshold: 'TBD (Configurable)' },
            { code: '2.2.6', name: 'Gun Motor Lock Microswitch', status: 'CLOSED / CONTINUOUS', threshold: 'TBD (Configurable)' },
          ],
        },
      ];

    case 'RECOIL':
      return [
        {
          id: '3.1',
          code: '3.1',
          title: 'Recoil Distance Reading',
          parameter: 'Buffer Stroke Travel',
          value: '275.0',
          unit: 'mm',
          range: '250 – 300 mm = NORMAL',
          status: 'NORMAL',
          statusDetails: '250-300 mm = NORMAL | 300-350 mm = WARNING | Above 350 mm = CRITICAL ALERT | <250 mm = Out of Range Safe',
          details: 'Stroke distance of the recoil buffer cylinder measured in millimetres (mm). Critical threshold at >350 mm indicates buffer bottoming-out risk.',
        },
        {
          id: '3.2',
          code: '3.2',
          title: 'Recoil Speed Reading',
          parameter: 'Recoil Motion Speed',
          value: '1.85',
          unit: 'm/s',
          range: '1.50 – 2.20 m/s',
          status: 'NORMAL',
          statusDetails: 'Recoil velocity measured through displacement rate tracking.',
          details: 'Evaluates fluid orifice throttling and damper rod damping resistance.',
        },
        {
          id: '3.3',
          code: '3.3',
          title: 'Recoil Time Reading',
          parameter: 'Cycle Duration Time',
          value: '0.32',
          unit: 's',
          range: '0.28 – 0.38 s',
          status: 'NORMAL',
          statusDetails: 'Recoil stroke return time in seconds.',
          details: 'Verifies pneumatic recuperator counter-pressure and return spring cycle completion.',
        },
        {
          id: '3.4',
          code: '3.4',
          title: 'Recoil Oil Level',
          parameter: 'Hydraulic Buffer Reservoir',
          value: '94.0',
          unit: '%',
          range: '> 85.0 % (Nominal: 90 - 100%)',
          status: 'NORMAL',
          statusDetails: 'Hydraulic fluid reservoir percentage in recoil damper accumulator.',
          details: 'Ensures adequate fluid charge to prevent aeration, cavitation, and thermal seal degradation.',
        },
      ];

    case 'ELEVATION':
      return [
        {
          id: '4.1',
          code: '4.1',
          title: 'K1 Voltage Check',
          parameter: 'K1 Elevation Contactor Voltage',
          value: '32.5',
          unit: 'V',
          range: '25 – 40 V = IDEAL / NORMAL',
          status: 'NORMAL',
          statusDetails: '25-40 V = IDEAL / NORMAL. Displayed strictly in Volts (V), not Amps.',
          details: 'Primary electrical relay K1 coil and bus supply voltage for elevation drive control.',
        },
        {
          id: '4.2',
          code: '4.2',
          title: 'Power Supply Mount Voltage Check',
          parameter: 'PSM Regulated Bus Voltage',
          value: '33.0',
          unit: 'V',
          range: '25 – 40 V = IDEAL / NORMAL',
          status: 'NORMAL',
          statusDetails: '25-40 V = IDEAL / NORMAL. Displayed strictly in Volts (V), not Amps.',
          details: 'Electrical voltage delivery from the elevation power supply mount assembly.',
        },
        {
          id: '4.3',
          code: '4.3',
          title: 'Actuating Cylinder Hydraulic Fluid Pressure',
          parameter: 'Elevation Cylinder Pressure',
          value: '125.0',
          unit: 'MPa',
          range: '10 – 200 MPa = NORMAL',
          status: 'NORMAL',
          statusDetails: '10 - 200 MPa = NORMAL. Displayed in MPa.',
          details: 'Operating hydraulic fluid pressure in the elevation actuating cylinder powering gun trunnion movement.',
        },
      ];

    case 'AZIMUTH':
      return [
        {
          id: '5.1',
          code: '5.1',
          title: 'K1 Voltage Check',
          parameter: 'K1 Azimuth Contactor Voltage',
          value: '32.5',
          unit: 'V',
          range: '25 – 40 V = IDEAL / NORMAL',
          status: 'NORMAL',
          statusDetails: '25-40 V = IDEAL / NORMAL. Displayed strictly in Volts (V), not Amps.',
          details: 'Electrical voltage reading across the K1 azimuth slew drive contactor.',
        },
        {
          id: '5.2',
          code: '5.2',
          title: 'MP9 Voltage Check',
          parameter: 'MP9 Distribution Rail Voltage',
          value: '31.8',
          unit: 'V',
          range: '25 – 40 V = IDEAL / NORMAL',
          status: 'NORMAL',
          statusDetails: '25-40 V = IDEAL / NORMAL. Displayed strictly in Volts (V), not Amps.',
          details: 'Auxiliary electrical distribution rail MP9 voltage for turret rotation electronics.',
        },
        {
          id: '5.3',
          code: '5.3',
          title: 'Actuating Motor Voltage Check',
          parameter: 'Azimuth Drive Motor Voltage',
          value: '34.0',
          unit: 'V',
          range: '25 – 40 V = IDEAL / NORMAL',
          status: 'NORMAL',
          statusDetails: '25-40 V = IDEAL / NORMAL. Displayed strictly in Volts (V), not Amps.',
          details: 'Terminal electrical voltage supplied to the high-torque azimuth slew drive motor.',
        },
      ];

    case 'TRAVERSE':
      return [
        {
          id: '6.1',
          code: '6.1',
          title: 'Traverse Voltage Check',
          parameter: 'Traverse Slew Rail Voltage',
          value: '32.0',
          unit: 'V',
          range: '25 – 40 V = IDEAL / NORMAL',
          status: 'NORMAL',
          statusDetails: '25-40 V = IDEAL / NORMAL. Displayed strictly in Volts (V), not Amps.',
          details: 'Electrical voltage monitoring across the traverse tracking drive bus.',
        },
        {
          id: '6.2',
          code: '6.2',
          title: 'Traverse Motor Voltage Check',
          parameter: 'Traverse Servomotor Voltage',
          value: '33.5',
          unit: 'V',
          range: '25 – 40 V = IDEAL / NORMAL',
          status: 'NORMAL',
          statusDetails: '25-40 V = IDEAL / NORMAL. Displayed strictly in Volts (V), not Amps.',
          details: 'Fine-tracking servo motor voltage regulation on traverse mechanism.',
        },
      ];

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
  initiallyExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(initiallyExpanded);
  const [selectedSubItem, setSelectedSubItem] = useState<TechnicalSubItem | null>(null);

  const hi = subsystem.current_health_index;
  const isHealthy = hi >= 75;
  const isDegrading = hi >= 50 && hi < 75;
  const isSevere = hi < 50;

  const scoreColor = isHealthy
    ? 'text-emerald-400'
    : isDegrading
    ? 'text-amber-400'
    : 'text-red-400';

  const strokeColor = isHealthy ? '#10b981' : isDegrading ? '#f59e0b' : '#ef4444';

  const subItems = getSubsystemTechnicalItems(subsystem.code);

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
          <StatusBadge status={subsystem.status_band || 'HEALTHY'} size="sm" />
        </div>

        {/* Health Score Gauge Display */}
        <div className="flex items-baseline justify-between mt-4">
          <div>
            <div className="text-[11px] font-mono text-slate-400 uppercase">Health Index</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-3xl font-mono font-bold ${scoreColor}`}>
                {subsystem.current_health_index.toFixed(1)}%
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

        {/* Interactive Expandable Sub-Items Section */}
        {subItems.length > 0 && (
          <div className="mt-4 pt-3 border-t border-defense-800 font-mono">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full flex items-center justify-between text-xs py-1 px-2 rounded bg-defense-950 hover:bg-defense-800/80 text-cyan-400 border border-defense-800 transition-colors"
            >
              <span className="font-semibold flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                Technical Checks ({subItems.length} Sub-Items)
              </span>
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {isExpanded && (
              <div className="mt-2.5 space-y-1.5 bg-defense-950/70 p-2 rounded border border-defense-800/80">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Hierarchical Sub-Items</span>
                  <span className="text-cyan-400">Click to Inspect</span>
                </div>
                {subItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedSubItem(item)}
                    className="w-full text-left p-2 rounded bg-defense-900 hover:bg-cyan-950/40 border border-defense-800 hover:border-cyan-600/50 transition-all flex items-center justify-between group"
                  >
                    <div className="flex-1 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-cyan-400 font-bold text-xs">{item.code}</span>
                        <span className="text-slate-200 text-xs font-medium group-hover:text-cyan-200">
                          {item.title}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                        <span>Range: {item.range}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-400 bg-defense-950 px-2 py-0.5 rounded border border-defense-800">
                        {item.value} {item.unit !== 'STATE' && item.unit !== 'SWITCHES' ? item.unit : ''}
                      </span>
                      <Eye className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400" />
                    </div>
                  </button>
                ))}
              </div>
            )}
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

      {/* Sub-Item Technical Inspection Modal */}
      {selectedSubItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 font-mono">
          <div className="bg-defense-900 border border-defense-700 rounded-lg max-w-lg w-full p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-defense-800">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                <ShieldCheck className="w-4 h-4" />
                <span>TECHNICAL CHECK INSPECTION [{selectedSubItem.code}]</span>
              </div>
              <button
                onClick={() => setSelectedSubItem(null)}
                className="text-slate-400 hover:text-slate-100 p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-4 space-y-3 text-xs bg-defense-950 p-3.5 rounded border border-defense-800">
              <div className="flex justify-between items-center pb-2 border-b border-defense-850">
                <span className="text-slate-400 uppercase">Check Name:</span>
                <span className="text-slate-100 font-bold text-sm">{selectedSubItem.title}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Parameter:</span>
                <span className="text-cyan-300">{selectedSubItem.parameter}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Telemetry Value:</span>
                <span className="text-emerald-400 font-bold text-sm bg-defense-900 px-2 py-0.5 rounded border border-defense-800">
                  {selectedSubItem.value} {selectedSubItem.unit}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Specified Range:</span>
                <span className="text-slate-200">{selectedSubItem.range}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Status Assessment:</span>
                <StatusBadge status={selectedSubItem.status} size="sm" />
              </div>
              <div className="pt-2 border-t border-defense-850">
                <span className="text-slate-400 block mb-1">Operational Rule / Thresholds:</span>
                <div className="text-[11px] text-amber-300 bg-defense-900/80 p-2 rounded border border-defense-800 leading-relaxed">
                  {selectedSubItem.statusDetails}
                </div>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Technical Description:</span>
                <p className="text-slate-300 leading-relaxed text-[11px]">{selectedSubItem.details}</p>
              </div>

              {/* Six Microswitches List for ALG */}
              {selectedSubItem.subSwitches && selectedSubItem.subSwitches.length > 0 && (
                <div className="mt-3 pt-3 border-t border-defense-800">
                  <div className="text-slate-300 font-semibold mb-2 flex items-center justify-between">
                    <span>6-Microswitch Circuit Status:</span>
                    <span className="text-[10px] text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">
                      Current Threshold: TBD (Configurable)
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedSubItem.subSwitches.map((sw) => (
                      <div
                        key={sw.code}
                        className="bg-defense-900 p-2 rounded border border-defense-800 flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-cyan-400 font-bold">{sw.code}</span>
                          <span className="text-emerald-400 text-[10px] font-semibold">{sw.status}</span>
                        </div>
                        <div className="text-slate-200 font-medium text-[11px] mt-1">{sw.name}</div>
                        <div className="text-slate-400 text-[10px] mt-1">Threshold: {sw.threshold}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-defense-800">
              <button
                onClick={() => setSelectedSubItem(null)}
                className="px-4 py-1.5 rounded bg-defense-800 hover:bg-defense-700 text-slate-200 text-xs transition-colors"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
