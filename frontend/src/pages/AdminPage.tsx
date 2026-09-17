import React, { useState, useEffect } from 'react';
import { User, Subsystem } from '../types';
import { api } from '../services/api';
import { ShieldCheck, UserPlus, Sliders, Database, KeyRound, RefreshCw } from 'lucide-react';

export const AdminPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [subsystems, setSubsystems] = useState<Subsystem[]>([]);
  const [systemConfig, setSystemConfig] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // New user form state
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState('VIEWER');
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  const fetchData = async () => {
    try {
      const [uList, sList, cfg] = await Promise.all([
        api.getUsers(),
        api.getSubsystems(),
        api.getSystemConfig(),
      ]);
      setUsers(uList);
      setSubsystems(sList);
      setSystemConfig(cfg);
    } catch (e) {
      console.error('Failed to load admin data', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingUser(true);
    try {
      await api.createUser({
        username: newUsername,
        email: newEmail,
        password: newPassword,
        full_name: newFullName,
        role: newRole,
      });
      setNewUsername('');
      setNewEmail('');
      setNewPassword('');
      setNewFullName('');
      await fetchData();
      alert('User created successfully.');
    } catch (e: any) {
      alert('Failed to create user: ' + e.message);
    } finally {
      setIsCreatingUser(false);
    }
  };

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Header */}
      <div>
        <h1 className="text-base font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-cyan-400" />
          SYSTEM ADMINISTRATION &amp; CONFIGURATION
        </h1>
        <p className="text-slate-400 mt-1">
          Role-based access control, operator identity management, mathematical thresholds, and baseline calibration.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Management */}
        <div className="lg:col-span-2 bg-defense-900 border border-defense-700/80 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-defense-800">
            <span className="font-bold text-slate-100 tracking-wider uppercase">
              REGISTERED SYSTEM OPERATORS &amp; ROLES
            </span>
            <span className="text-slate-400">{users.length} Users Active</span>
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-defense-700 text-slate-400 bg-defense-950/60">
                <th className="py-2 px-3">USERNAME</th>
                <th className="py-2 px-3">FULL NAME</th>
                <th className="py-2 px-3">EMAIL</th>
                <th className="py-2 px-3">ROLE</th>
                <th className="py-2 px-3">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-defense-800">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-defense-850">
                  <td className="py-2 px-3 text-cyan-400 font-semibold">{u.username}</td>
                  <td className="py-2 px-3 text-slate-200">{u.full_name}</td>
                  <td className="py-2 px-3 text-slate-400">{u.email}</td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] ${
                      u.role === 'ADMIN'
                        ? 'bg-purple-950 text-purple-300 border border-purple-800'
                        : u.role === 'TECHNICIAN'
                        ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                        : 'bg-defense-800 text-slate-300'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <span className="text-emerald-400">Active</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* New User Form */}
          <div className="pt-4 border-t border-defense-800">
            <h3 className="font-bold text-slate-200 mb-3 flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-cyan-400" />
              PROVISION NEW OPERATOR / TECHNICIAN ACCOUNT
            </h3>
            <form onSubmit={handleCreateUser} className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Username:</label>
                <input
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g. j_miller"
                  className="w-full bg-defense-950 border border-defense-700 rounded p-1.5 text-slate-200"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Full Name:</label>
                <input
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="e.g. John Miller"
                  className="w-full bg-defense-950 border border-defense-700 rounded p-1.5 text-slate-200"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Email:</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="e.g. jmiller@defense.lab"
                  className="w-full bg-defense-950 border border-defense-700 rounded p-1.5 text-slate-200"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Password:</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-defense-950 border border-defense-700 rounded p-1.5 text-slate-200"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Role Permission:</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full bg-defense-950 border border-defense-700 rounded p-1.5 text-slate-200"
                >
                  <option value="VIEWER">VIEWER (Read-Only Dashboards)</option>
                  <option value="TECHNICIAN">TECHNICIAN (Acknowledge &amp; Maintain)</option>
                  <option value="ADMIN">ADMIN (Full System Configuration)</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={isCreatingUser}
                  className="w-full py-1.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 transition-colors font-bold"
                >
                  {isCreatingUser ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* System Settings & Thresholds */}
        <div className="bg-defense-900 border border-defense-700/80 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-defense-800">
            <span className="font-bold text-slate-100 tracking-wider uppercase flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              RUNTIME MATHEMATICAL PARAMETERS
            </span>
          </div>

          {systemConfig && (
            <div className="space-y-3">
              <div className="bg-defense-950 p-3 rounded border border-defense-800">
                <div className="text-slate-400">Statistical Deviation Coefficient:</div>
                <div className="text-base font-bold text-cyan-300 mt-0.5">
                  k = {systemConfig.k_sigma} &sigma;
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  Formula: min(1.0, |x - &mu;| / (k &times; &sigma;))
                </div>
              </div>

              <div className="bg-defense-950 p-3 rounded border border-defense-800">
                <div className="text-slate-400">Out-of-Order Ingestion Window:</div>
                <div className="text-base font-bold text-slate-200 mt-0.5">
                  {systemConfig.out_of_order_tolerance_sec} seconds
                </div>
              </div>

              <div className="bg-defense-950 p-3 rounded border border-defense-800">
                <div className="text-slate-400">Prognostics Minimum History Threshold:</div>
                <div className="text-base font-bold text-slate-200 mt-0.5">
                  {systemConfig.rul_min_samples} degradation points
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  Safeguard against data fabrication when history is sparse.
                </div>
              </div>

              <div className="bg-defense-950 p-3 rounded border border-defense-800">
                <div className="text-slate-400">Anomaly Warning / Critical Limits:</div>
                <div className="text-xs text-amber-400 mt-0.5">Warning: &ge; {systemConfig.warning_threshold * 100}% deviation</div>
                <div className="text-xs text-red-400 mt-0.5">Critical: &ge; {systemConfig.critical_threshold * 100}% deviation</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
