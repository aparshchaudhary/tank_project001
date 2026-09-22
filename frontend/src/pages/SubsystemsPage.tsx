import React, { useState, useEffect } from 'react';
import { Subsystem } from '../types';
import { api } from '../services/api';
import { SubsystemCard } from '../components/common/SubsystemCard';
import { Cpu, RefreshCw, Filter } from 'lucide-react';

interface SubsystemsPageProps {
  onDrillDown: (subsystemId: string) => void;
}

export const SubsystemsPage: React.FC<SubsystemsPageProps> = ({ onDrillDown }) => {
  const [subsystems, setSubsystems] = useState<Subsystem[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const fetchSubsystems = async () => {
    try {
      const data = await api.getSubsystems();
      setSubsystems(data);
    } catch (e) {
      console.error('Failed to load subsystems', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubsystems();
    const interval = setInterval(fetchSubsystems, 5000);
    return () => clearInterval(interval);
  }, []);

  const ORDER = ['LRF', 'ALG', 'RECOIL', 'ELEVATION', 'AZIMUTH', 'TRAVERSE'];
  const sortedSubsystems = [...subsystems].sort((a, b) => {
    const idxA = ORDER.indexOf(a.code);
    const idxB = ORDER.indexOf(b.code);
    return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
  });

  const categories = ['ALL', ...new Set(sortedSubsystems.map((s) => s.category))];
  const filtered = categoryFilter === 'ALL'
    ? sortedSubsystems
    : sortedSubsystems.filter((s) => s.category === categoryFilter);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 font-mono text-cyan-400">
        <RefreshCw className="w-6 h-6 animate-spin mr-3" />
        LOADING TURRET SUBSYSTEMS...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 font-mono">
        <div>
          <h1 className="text-base font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            TURRET SUBASSEMBLY HEALTH & CONDITION INVENTORY
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time condition monitoring, baseline tracking, and prognostic evaluation across all laboratory turret stages.
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-400">Category:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-defense-900 border border-defense-700 text-slate-200 rounded px-2.5 py-1"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((sub) => (
          <SubsystemCard
            key={sub.id}
            subsystem={sub}
            onDrillDown={onDrillDown}
          />
        ))}
      </div>
    </div>
  );
};
