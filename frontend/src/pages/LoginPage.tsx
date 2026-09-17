import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, User as UserIcon, Radio, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const setCredentials = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-defense-950 flex flex-col justify-center items-center p-4 font-mono">
      <div className="max-w-md w-full bg-defense-900 border border-defense-700/80 rounded-lg p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 mx-auto flex items-center justify-center">
            <Shield className="w-7 h-7" />
          </div>
          <h1 className="text-lg font-bold text-slate-100 tracking-wider">
            TURRET CBPM PLATFORM
          </h1>
          <p className="text-xs text-slate-400">
            Condition-Based Predictive Maintenance &amp; Health Monitoring
          </p>

          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-400 font-bold uppercase mt-2">
            <Radio className="w-3 h-3 animate-pulse" />
            LABORATORY TEST-BENCH PROTOTYPE
          </div>
        </div>

        {error && (
          <div className="bg-red-950/80 border border-red-800 text-red-300 p-3 rounded text-xs">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Operator Identifier:</label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                required
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Operator ID"
                className="w-full bg-defense-950 border border-defense-700 rounded py-2 pl-9 pr-3 text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Security Passcode:</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Passcode"
                className="w-full bg-defense-950 border border-defense-700 rounded py-2 pl-9 pr-3 text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 hover:bg-cyan-500/30 transition-colors font-bold flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
          >
            {isLoading ? 'Verifying...' : 'Access Telemetry Console'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Demo Credentials */}
        <div className="pt-4 border-t border-defense-800 space-y-2">
          <div className="text-[11px] text-slate-400 text-center uppercase tracking-wide">
            Test Bench Quick-Fill Roles:
          </div>
          <div className="grid grid-cols-3 gap-2 text-[10px]">
            <button
              onClick={() => setCredentials('admin', 'admin123')}
              className="p-2 rounded bg-defense-950 border border-defense-800 hover:border-purple-500/60 text-purple-300 text-center"
            >
              <div className="font-bold">ADMIN</div>
              <div className="text-slate-400">admin123</div>
            </button>
            <button
              onClick={() => setCredentials('tech', 'tech123')}
              className="p-2 rounded bg-defense-950 border border-defense-800 hover:border-cyan-500/60 text-cyan-300 text-center"
            >
              <div className="font-bold">TECHNICIAN</div>
              <div className="text-slate-400">tech123</div>
            </button>
            <button
              onClick={() => setCredentials('viewer', 'viewer123')}
              className="p-2 rounded bg-defense-950 border border-defense-800 hover:border-slate-500/60 text-slate-300 text-center"
            >
              <div className="font-bold">VIEWER</div>
              <div className="text-slate-400">viewer123</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
