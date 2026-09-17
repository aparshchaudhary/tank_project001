import React, { useState, useEffect } from 'react';
import { AuditLogEntry } from '../types';
import { api } from '../services/api';
import { ScrollText, Filter, RefreshCw, Search } from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [actionFilter, setActionFilter] = useState<string>('');
  const [entityFilter, setEntityFilter] = useState<string>('');
  const [userQuery, setUserQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      const data = await api.getAuditLogs({
        action: actionFilter || undefined,
        entity: entityFilter || undefined,
        username: userQuery || undefined,
      });
      setLogs(data);
    } catch (e) {
      console.error('Failed to load audit logs', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, entityFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-cyan-400" />
            IMMUTABLE SECURITY AUDIT TRAIL
          </h1>
          <p className="text-slate-400 mt-1">
            Complete cryptographic and operator attribution logs for every configuration change, alert acknowledgment, and baseline update.
          </p>
        </div>

        {/* Filters */}
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Search by operator username..."
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            className="bg-defense-900 border border-defense-700 text-slate-200 rounded px-2.5 py-1.5 w-52"
          />

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-defense-900 border border-defense-700 text-slate-200 rounded px-2.5 py-1.5"
          >
            <option value="">All Actions</option>
            <option value="LOGIN">LOGIN</option>
            <option value="CONFIG_CHANGE">CONFIG_CHANGE</option>
            <option value="ACKNOWLEDGE_ALERT">ACKNOWLEDGE_ALERT</option>
            <option value="RESOLVE_ALERT">RESOLVE_ALERT</option>
            <option value="CREATE_MAINTENANCE">CREATE_MAINTENANCE</option>
            <option value="CREATE_BASELINE">CREATE_BASELINE</option>
            <option value="DEPLOY_MODEL">DEPLOY_MODEL</option>
          </select>

          <button
            type="submit"
            className="px-3 py-1.5 rounded bg-defense-800 text-slate-200 border border-defense-700 hover:bg-defense-700"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

      {/* Audit Log Table */}
      <div className="bg-defense-900 border border-defense-700/80 rounded-lg overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-defense-700 text-slate-400 bg-defense-950/60">
              <th className="py-2.5 px-4">TIMESTAMP (UTC)</th>
              <th className="py-2.5 px-4">OPERATOR</th>
              <th className="py-2.5 px-4">ROLE</th>
              <th className="py-2.5 px-4">ACTION</th>
              <th className="py-2.5 px-4">ENTITY</th>
              <th className="py-2.5 px-4">DESCRIPTION / EVENT LOG</th>
              <th className="py-2.5 px-4">IP ORIGIN</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-defense-800">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  No audit logs recorded for this query.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-defense-850">
                  <td className="py-2.5 px-4 text-slate-300">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 text-cyan-300 font-semibold">{log.username}</td>
                  <td className="py-2.5 px-4">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-defense-800 text-slate-300">
                      {log.role}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-amber-300 font-bold">{log.action}</td>
                  <td className="py-2.5 px-4 text-slate-400">{log.entity}</td>
                  <td className="py-2.5 px-4 text-slate-200">{log.description}</td>
                  <td className="py-2.5 px-4 text-slate-400">{log.ip_address || '127.0.0.1'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
