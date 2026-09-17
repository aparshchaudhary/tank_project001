import React, { useState, useEffect } from 'react';
import { Alert, Subsystem } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { AcknowledgeModal, ResolveModal } from '../components/common/Modals';
import { AlertTriangle, CheckCircle, Filter, RefreshCw, MessageSquare } from 'lucide-react';

export const AlertsPage: React.FC = () => {
  const { role } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [subsystems, setSubsystems] = useState<Subsystem[]>([]);
  const [selectedSubsystem, setSelectedSubsystem] = useState<string>('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [ackAlert, setAckAlert] = useState<Alert | null>(null);
  const [resolveAlert, setResolveAlert] = useState<Alert | null>(null);

  const fetchAlerts = async () => {
    try {
      const [alertList, subList] = await Promise.all([
        api.getAlerts({
          subsystem_id: selectedSubsystem || undefined,
          severity: selectedSeverity || undefined,
          status: selectedStatus || undefined,
        }),
        api.getSubsystems(),
      ]);
      setAlerts(alertList);
      setSubsystems(subList);
    } catch (e) {
      console.error('Failed to load alerts', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 4000);
    return () => clearInterval(interval);
  }, [selectedSubsystem, selectedSeverity, selectedStatus]);

  const handleAcknowledge = async (notes?: string) => {
    if (!ackAlert) return;
    await api.acknowledgeAlert(ackAlert.id, notes);
    await fetchAlerts();
  };

  const handleResolve = async (notes: string) => {
    if (!resolveAlert) return;
    await api.resolveAlert(resolveAlert.id, notes);
    await fetchAlerts();
  };

  const canAct = role === 'TECHNICIAN' || role === 'ADMIN';

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            CONDITION ALERT MANAGEMENT WORKSPACE
          </h1>
          <p className="text-slate-400 mt-1">
            Real-time threshold trips, statistical deviation alerts, technician acknowledgement, and lifecycle resolution.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Subsystem filter */}
          <select
            value={selectedSubsystem}
            onChange={(e) => setSelectedSubsystem(e.target.value)}
            className="bg-defense-900 border border-defense-700 text-slate-200 rounded px-2.5 py-1.5"
          >
            <option value="">All Subsystems</option>
            {subsystems.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Severity filter */}
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="bg-defense-900 border border-defense-700 text-slate-200 rounded px-2.5 py-1.5"
          >
            <option value="">All Severities</option>
            <option value="WARNING">WARNING</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>

          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-defense-900 border border-defense-700 text-slate-200 rounded px-2.5 py-1.5"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
            <option value="RESOLVED">RESOLVED</option>
          </select>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="bg-defense-900 border border-defense-700/80 rounded-lg overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-defense-700 text-slate-400 bg-defense-950/60">
              <th className="py-2.5 px-3">TIMESTAMP</th>
              <th className="py-2.5 px-3">SEVERITY</th>
              <th className="py-2.5 px-3">SUBSYSTEM</th>
              <th className="py-2.5 px-3">FEATURE</th>
              <th className="py-2.5 px-3">VAL / BASELINE</th>
              <th className="py-2.5 px-3">HEALTH SNAPSHOT</th>
              <th className="py-2.5 px-3">PROBABLE CONDITION</th>
              <th className="py-2.5 px-3">STATUS</th>
              <th className="py-2.5 px-3">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-defense-800">
            {alerts.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-400">
                  No alerts match current filter criteria.
                </td>
              </tr>
            ) : (
              alerts.map((a) => (
                <tr key={a.id} className="hover:bg-defense-850 transition-colors">
                  <td className="py-2.5 px-3 text-slate-300">
                    {new Date(a.timestamp).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3">
                    <StatusBadge status={a.severity} size="sm" />
                  </td>
                  <td className="py-2.5 px-3 text-slate-100 font-semibold">{a.subsystem_name}</td>
                  <td className="py-2.5 px-3 text-cyan-300">{a.feature_name}</td>
                  <td className="py-2.5 px-3 text-slate-300">
                    {a.current_value.toFixed(2)} / {a.baseline_value.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`font-bold ${a.health_index_snapshot >= 75 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {a.health_index_snapshot.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-200">{a.probable_issue}</td>
                  <td className="py-2.5 px-3">
                    <StatusBadge status={a.status} size="sm" />
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1.5">
                      {a.status === 'ACTIVE' && canAct && (
                        <button
                          onClick={() => setAckAlert(a)}
                          className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30"
                        >
                          Ack
                        </button>
                      )}

                      {a.status === 'ACKNOWLEDGED' && canAct && (
                        <button
                          onClick={() => setResolveAlert(a)}
                          className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30"
                        >
                          Resolve
                        </button>
                      )}

                      {a.notes && (
                        <span
                          className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
                          title={a.notes}
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {ackAlert && (
        <AcknowledgeModal
          alert={ackAlert}
          onClose={() => setAckAlert(null)}
          onConfirm={handleAcknowledge}
        />
      )}

      {resolveAlert && (
        <ResolveModal
          alert={resolveAlert}
          onClose={() => setResolveAlert(null)}
          onConfirm={handleResolve}
        />
      )}
    </div>
  );
};
