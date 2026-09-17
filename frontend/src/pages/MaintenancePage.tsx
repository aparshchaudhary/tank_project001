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

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <Wrench className="w-5 h-5 text-amber-400" />
            MAINTENANCE DECISION-SUPPORT & SERVICE LOGS
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
