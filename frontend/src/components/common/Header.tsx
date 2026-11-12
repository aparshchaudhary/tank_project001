import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTelemetry } from '../../context/TelemetryContext';
import { Shield, Radio, Activity, AlertTriangle, User as UserIcon, LogOut, CheckCircle2 } from 'lucide-react';

interface HeaderProps {
  onOpenAlerts?: () => void;
  activeAlertCount?: number;
}

export const Header: React.FC<HeaderProps> = ({ onOpenAlerts, activeAlertCount = 0 }) => {
  const { user, role, logout } = useAuth();
  const { isConnected, hasLiveData } = useTelemetry();

  return (
    <header className="h-16 bg-defense-900 border-b border-defense-700/60 px-6 flex items-center justify-between sticky top-0 z-30 shadow-md">
      {/* Platform Title & Branding */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-wider text-base text-slate-100 font-mono">TURRET CBPM</span>
              <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-800/80 px-1.5 py-0.5 rounded font-mono uppercase">
                v1.0.0
              </span>
            </div>
            <div className="text-[11px] text-slate-400 tracking-tight hidden sm:block">
              Condition-Based Predictive Maintenance & Health Monitoring Platform
            </div>
          </div>
        </div>

        {/* TELEMETRY INGESTION NOTICE */}
        <div className={`ml-4 px-2.5 py-1 rounded flex items-center gap-2 ${
          hasLiveData
            ? 'bg-emerald-500/10 border border-emerald-500/30'
            : 'bg-amber-500/10 border border-amber-500/30'
        }`}>
          <Radio className={`w-3.5 h-3.5 ${hasLiveData ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`} />
          <span className={`text-[11px] font-mono font-bold tracking-wide uppercase ${
            hasLiveData ? 'text-emerald-400' : 'text-amber-400'
          }`}>
            {hasLiveData ? 'LIVE TELEMETRY INGESTION' : 'TELEMETRY STANDBY • AWAITING INGESTION'}
          </span>
        </div>
      </div>

      {/* Center/Right Actions & Telemetry Status */}
      <div className="flex items-center gap-4">
        {/* DAQ / Stream Status */}
        <div className="flex items-center gap-2 px-3 py-1 rounded bg-defense-950 border border-defense-700/60 font-mono text-xs">
          <span className={`w-2 h-2 rounded-full ${
            !isConnected
              ? 'bg-red-500 animate-ping'
              : hasLiveData
              ? 'bg-emerald-400 shadow-[0_0_8px_#10b981] animate-pulse'
              : 'bg-amber-400 shadow-[0_0_8px_#f59e0b]'
          }`} />
          <span className="text-slate-400 text-[11px]">STREAM:</span>
          <span className={
            !isConnected
              ? 'text-red-400 font-semibold'
              : hasLiveData
              ? 'text-emerald-400 font-semibold'
              : 'text-amber-400 font-semibold'
          }>
            {!isConnected ? 'DISCONNECTED' : hasLiveData ? 'LIVE' : 'STANDBY (AWAITING DATA)'}
          </span>
        </div>

        {/* Active Alerts Button */}
        <button
          onClick={onOpenAlerts}
          className={`flex items-center gap-2 px-3 py-1 rounded font-mono text-xs border transition-colors ${
            activeAlertCount > 0
              ? 'bg-red-500/15 border-red-500/40 text-red-400 hover:bg-red-500/25'
              : 'bg-defense-950 border-defense-700/60 text-slate-400 hover:text-slate-200'
          }`}
        >
          <AlertTriangle className={`w-3.5 h-3.5 ${activeAlertCount > 0 ? 'text-red-400 animate-bounce' : ''}`} />
          <span>ALERTS:</span>
          <span className="font-bold">{activeAlertCount}</span>
        </button>

        {/* User Role Badge & Profile */}
        <div className="flex items-center gap-3 pl-3 border-l border-defense-700/60">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold text-slate-200 leading-tight">
              {user?.full_name || 'System Operator'}
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-defense-700 text-slate-300 uppercase">
              {role}
            </span>
          </div>

          <button
            onClick={logout}
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-defense-800 rounded transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
