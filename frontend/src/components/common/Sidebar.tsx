import React from 'react';
import {
  LayoutDashboard,
  Activity,
  Cpu,
  AlertTriangle,
  TrendingDown,
  Wrench,
  FileText,
  Radio,
  BrainCircuit,
  ShieldCheck,
  ScrollText,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export type NavigationTab =
  | 'overview'
  | 'live'
  | 'subsystems'
  | 'alerts'
  | 'analytics'
  | 'maintenance'
  | 'reports'
  | 'simulator'
  | 'models'
  | 'admin'
  | 'audit';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  activeAlertsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab, activeAlertsCount = 0 }) => {
  const { role } = useAuth();

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, minRole: 'VIEWER' },
    { id: 'live', label: 'Live Monitoring', icon: Activity, minRole: 'VIEWER' },
    { id: 'subsystems', label: 'Subsystems', icon: Cpu, minRole: 'VIEWER' },
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle, badge: activeAlertsCount, minRole: 'VIEWER' },
    { id: 'analytics', label: 'Analytics', icon: TrendingDown, minRole: 'VIEWER' },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench, minRole: 'VIEWER' },
    { id: 'reports', label: 'Reports', icon: FileText, minRole: 'VIEWER' },
    { id: 'simulator', label: 'Data Simulator', icon: Radio, minRole: 'VIEWER' },
    { id: 'models', label: 'AI / Models', icon: BrainCircuit, minRole: 'VIEWER' },
    { id: 'admin', label: 'Administration', icon: ShieldCheck, minRole: 'ADMIN' },
    { id: 'audit', label: 'Audit Logs', icon: ScrollText, minRole: 'TECHNICIAN' },
  ];

  return (
    <aside className="w-64 bg-defense-900 border-r border-defense-700/60 flex flex-col justify-between flex-shrink-0 min-h-[calc(100vh-4rem)]">
      {/* Navigation List */}
      <nav className="p-3 space-y-1">
        <div className="px-3 py-2 text-[10px] font-mono tracking-wider text-slate-400 uppercase">
          SYSTEM NAVIGATION
        </div>
        {navItems.map((item) => {
          // Check role visibility
          if (item.minRole === 'ADMIN' && role !== 'ADMIN') return null;
          if (item.minRole === 'TECHNICIAN' && role === 'VIEWER') return null;

          const isActive = currentTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id as NavigationTab)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md font-mono text-xs transition-colors ${
                isActive
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-300 hover:bg-defense-800 hover:text-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Safety Notice Footer */}
      <div className="p-4 border-t border-defense-700/60 bg-defense-950/40">
        <div className="text-[10px] font-mono text-amber-400/90 leading-relaxed uppercase border-l-2 border-amber-500/60 pl-2.5">
          <strong>LAB TEST BENCH</strong>
          <p className="text-slate-400 mt-0.5 normal-case font-sans text-[11px]">
            Maintenance decision-support prototype. Non-operational. Zero weapon logic.
          </p>
        </div>
      </div>
    </aside>
  );
};
