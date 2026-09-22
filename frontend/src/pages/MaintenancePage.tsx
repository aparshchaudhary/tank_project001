import React, { useState, useEffect } from 'react';
import { MaintenanceEvent, Subsystem } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { MaintenanceModal } from '../components/common/Modals';
import { Wrench, Plus, Filter, Clock, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const MaintenancePage: React.FC = () => {
  const { role } = useAuth();
  const [events, setEvents] = useState<MaintenanceEvent[]>([]);
  const [subsystems, setSubsystems] = useState<Subsystem[]>([]);
  const [selectedSubsystem, setSelectedSubsystem] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [mList, sList] = await Promise.all([
        api.getMaintenanceEvents(selectedSubsystem || undefined),
        api.getSubsystems(),
      ]);
      setEvents(mList);
      setSubsystems(sList);
    } catch (e) {
      console.error('Failed to load maintenance events', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedSubsystem]);

  const handleCreateEvent = async (data: any) => {
    await api.createMaintenanceEvent(data);
    await fetchData();
  };

  const canCreate = role === 'TECHNICIAN' || role === 'ADMIN';

  const [activeSubhead, setActiveSubhead] = useState<string>('RECOIL');

  const MAINTENANCE_SUBHEADS = [
    {
      id: 'RECOIL',
      code: '1. Recoil',
      name: 'Recoil',
      title: 'Recoil Mechanism Maintenance Sub-Head',
      description: 'Dynamic recoil buffer cylinder seals, stroke length calibration (250-300 mm normal), damper fluid reservoir level, and return timing.',
      points: [
        'Inspect dynamic stroke travel: Normal (250-300 mm), Warning (300-350 mm), Critical Alert (>350 mm).',
        'Verify buffer cylinder hydraulic fluid reservoir: maintain >85% capacity.',
        'Evaluate buffer piston velocity (nominal: 1.85 m/s) and return cycle time (0.32 s).',
        'Specific maintenance inspection points & scoring values to be configured later (TBD).',
      ],
    },
    {
      id: 'LRF',
      code: '2. LRF',
      name: 'LRF',
      title: 'Laser Range Finder Maintenance Sub-Head',
      description: 'Detector electrical voltage check (10.5-12.5V band), optical path cleanliness, and BITE range counter verification.',
      points: [
        'Verify detector supply voltage within 10.5–12.5 V (Nominal: 11.0–12.0 V). Displayed strictly in V, not Amps.',
        'Clean optoelectronic transmitter window and inspect beam collimation path.',
        'Execute BITE self-test routine and verify range discriminator calibration.',
        'Specific maintenance inspection points & scoring values to be configured later (TBD).',
      ],
    },
    {
      id: 'AZIMUTH',
      code: '3. Azimuth',
      name: 'Azimuth',
      title: 'Azimuth / Turret Drive Maintenance Sub-Head',
      description: 'Slew drive motor voltage (25-40V), K1 contactor inspection, MP9 rail distribution, and race bearing lubrication.',
      points: [
        'Verify K1 contactor and MP9 distribution rail voltages within 25–40 V normal band (in V, not Amps).',
        'Measure actuating motor operating terminal voltage under 360-degree slew load.',
        'Inspect turret ring race seals and sample lubricant grease for particulate wear.',
        'Specific maintenance inspection points & scoring values to be configured later (TBD).',
      ],
    },
    {
      id: 'TRAVERSE',
      code: '4. Traverse',
      name: 'Traverse',
      title: 'Traverse Drive Maintenance Sub-Head',
      description: 'Traverse servomotor voltage (25-40V), fine-tracking gear backlash, and electrical rail condition.',
      points: [
        'Verify traverse drive electrical bus voltage within 25–40 V normal range (in V, not Amps).',
        'Check fine-tracking gear drive backlash and harmonic drive clearance.',
        'Test servomotor brush/commutator wear and emergency mechanical stop switches.',
        'Specific maintenance inspection points & scoring values to be configured later (TBD).',
      ],
    },
    {
      id: 'ALG',
      code: '5. ALG',
      name: 'ALG',
      title: 'Automatic Loader & Gun System Maintenance Sub-Head',
      description: 'Circuit serviceability check, 6-microswitch contact inspection, and operating current verification.',
      points: [
        'Perform circuit serviceability continuity check through the autoloader sequencing harness.',
        'Inspect 6 critical microswitches: RC, CLM, Rammer, CBDM, CBDD, Gun Motor Lock.',
        'Operating current thresholds and actuation points: Configurable / TBD (pending values).',
        'Specific maintenance inspection points & scoring values to be configured later (TBD).',
      ],
    },
  ];

  const currentSubhead = MAINTENANCE_SUBHEADS.find((s) => s.id === activeSubhead) || MAINTENANCE_SUBHEADS[0];

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <Wrench className="w-5 h-5 text-amber-400" />
            MAINTENANCE DECISION-SUPPORT &amp; SERVICE LOGS
          </h1>
          <p className="text-slate-400 mt-1">
            Component replacement records, preventive inspection actions, lubrication schedules, and safe maintenance recommendations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Subsystem filter */}
          <select
            value={selectedSubsystem}
            onChange={(e) => setSelectedSubsystem(e.target.value)}
            className="bg-defense-900 border border-defense-700 text-slate-200 rounded px-2.5 py-1.5"
          >
            <option value="">All Monitored Subsystems</option>
            {subsystems.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {canCreate && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Log Work Order
            </button>
          )}
        </div>
      </div>

      {/* Safety Policy Banner */}
      <div className="bg-defense-950 border-l-4 border-amber-500 p-3.5 rounded border border-defense-800 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-[11px] leading-relaxed">
          <strong className="text-amber-400 uppercase">SAFETY DIRECTIVE: </strong>
          <span className="text-slate-300">
            Recommendations are strictly restricted to mechanical, electrical, and hydraulic inspection, lubrication, and re-baselining. No operational weapon or tactical actions are permitted through this platform.
          </span>
        </div>
      </div>

      {/* 5 Maintenance Sub-Heads Section (Section 11) */}
      <div className="bg-defense-900 border border-defense-700/80 rounded-lg p-4">
        <div className="flex items-center justify-between pb-3 border-b border-defense-800 mb-3">
          <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase tracking-wider">
            <Wrench className="w-4 h-4" />
            <span>MAINTENANCE SUB-HEADS (STRUCTURE &amp; PROTOCOLS)</span>
          </div>
          <span className="text-[11px] text-slate-400">
            Click sub-head to inspect servicing directives (Values Configurable / TBD)
          </span>
        </div>

        {/* 5 Sub-head Tab Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-4">
          {MAINTENANCE_SUBHEADS.map((sh) => (
            <button
              key={sh.id}
              onClick={() => setActiveSubhead(sh.id)}
              className={`p-2.5 rounded text-left transition-all border ${
                activeSubhead === sh.id
                  ? 'bg-cyan-950/60 border-cyan-500 text-cyan-200 shadow-sm'
                  : 'bg-defense-950 border-defense-800 text-slate-400 hover:text-slate-200 hover:border-defense-700'
              }`}
            >
              <div className="text-[10px] uppercase font-bold text-cyan-400">{sh.code}</div>
              <div className="font-semibold text-xs text-slate-100 mt-0.5">{sh.name}</div>
            </button>
          ))}
        </div>

        {/* Selected Sub-Head Details Box */}
        <div className="bg-defense-950 p-4 rounded border border-defense-800">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-defense-850">
            <h3 className="font-bold text-slate-100 text-sm">{currentSubhead.title}</h3>
            <span className="text-[10px] bg-amber-950/60 text-amber-400 px-2 py-0.5 rounded border border-amber-800">
              Detailed Points / Scoring Values: Configurable / TBD
            </span>
          </div>
          <p className="text-slate-300 text-xs mt-2 leading-relaxed">{currentSubhead.description}</p>

          <div className="mt-3">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-1.5">
              Current Servicing Checkpoints:
            </span>
            <ul className="space-y-1.5">
              {currentSubhead.points.map((pt, idx) => (
                <li key={idx} className="flex items-start gap-2 text-[11px] text-slate-300">
                  <span className="text-cyan-400 font-bold">•</span>
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Maintenance Table */}
      <div className="bg-defense-900 border border-defense-700/80 rounded-lg overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-defense-700 text-slate-400 bg-defense-950/60">
              <th className="py-2.5 px-4">DATE / TIME</th>
              <th className="py-2.5 px-4">SUBSYSTEM</th>
              <th className="py-2.5 px-4">EVENT TYPE</th>
              <th className="py-2.5 px-4">PRIORITY</th>
              <th className="py-2.5 px-4">ACTION DESCRIPTION</th>
              <th className="py-2.5 px-4">DIRECTIVE / RECOMMENDATION</th>
              <th className="py-2.5 px-4">OPERATING METER</th>
              <th className="py-2.5 px-4">TECHNICIAN</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-defense-800">
            {events.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  No maintenance actions logged for this filter.
                </td>
              </tr>
            ) : (
              events.map((e) => (
                <tr key={e.id} className="hover:bg-defense-850 transition-colors">
                  <td className="py-2.5 px-4 text-slate-300">
                    {new Date(e.created_at).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 text-slate-100 font-semibold">{e.subsystem_name}</td>
                  <td className="py-2.5 px-4 text-cyan-300 font-bold">{e.event_type}</td>
                  <td className="py-2.5 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] ${
                      e.maintenance_priority === 'IMMEDIATE'
                        ? 'bg-red-950 text-red-400 border border-red-800'
                        : e.maintenance_priority === 'HIGH'
                        ? 'bg-amber-950 text-amber-400 border border-amber-800'
                        : 'bg-defense-800 text-slate-300'
                    }`}>
                      {e.maintenance_priority}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-200">{e.description}</td>
                  <td className="py-2.5 px-4 text-amber-300">{e.recommendations || 'Inspect monitored subsystem.'}</td>
                  <td className="py-2.5 px-4 text-slate-400">{e.operating_hours.toFixed(1)} hrs ({e.operating_cycles} cyc)</td>
                  <td className="py-2.5 px-4 text-slate-300">{e.technician_name || 'Chief Tech'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <MaintenanceModal
          subsystems={subsystems}
          defaultSubsystemId={selectedSubsystem}
          onClose={() => setIsModalOpen(false)}
          onConfirm={handleCreateEvent}
        />
      )}
    </div>
  );
};
