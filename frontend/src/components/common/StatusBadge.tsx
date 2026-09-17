import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const s = status.toUpperCase();

  let bgClass = 'bg-slate-800 text-slate-300 border-slate-700';
  let dotClass = 'bg-slate-400';

  if (s.includes('HEALTHY') || s === 'NORMAL') {
    bgClass = 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60';
    dotClass = 'bg-emerald-400';
  } else if (s.includes('EARLY DEVIATION') || s === 'STABLE') {
    bgClass = 'bg-cyan-950/80 text-cyan-400 border-cyan-800/60';
    dotClass = 'bg-cyan-400';
  } else if (s.includes('WARNING') || s.includes('DEGRADING')) {
    bgClass = 'bg-amber-950/80 text-amber-400 border-amber-800/60';
    dotClass = 'bg-amber-400';
  } else if (s.includes('CRITICAL') || s.includes('SIGNIFICANT') || s.includes('SEVERE')) {
    bgClass = 'bg-red-950/80 text-red-400 border-red-800/60';
    dotClass = 'bg-red-400 animate-pulse';
  } else if (s === 'ACTIVE') {
    bgClass = 'bg-red-950/80 text-red-300 border-red-800/60';
    dotClass = 'bg-red-400';
  } else if (s === 'ACKNOWLEDGED') {
    bgClass = 'bg-amber-950/80 text-amber-300 border-amber-800/60';
    dotClass = 'bg-amber-400';
  } else if (s === 'RESOLVED') {
    bgClass = 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60';
    dotClass = 'bg-emerald-400';
  }

  const px = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 font-mono font-medium rounded border ${bgClass} ${px}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`}></span>
      {status}
    </span>
  );
};
