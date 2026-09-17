import React from 'react';
import { Subsystem } from '../../types';
import { StatusBadge } from './StatusBadge';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, ArrowRight } from 'lucide-react';

interface SubsystemCardProps {
  subsystem: Subsystem;
  onDrillDown: (id: string) => void;
}

export const SubsystemCard: React.FC<SubsystemCardProps> = ({ subsystem, onDrillDown }) => {
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

  return (
    <div className="bg-defense-900 border border-defense-700/70 rounded-lg p-4 flex flex-col justify-between hover:border-cyan-500/50 transition-all shadow-sm">
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
