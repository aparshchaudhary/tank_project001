import React, { useState, useEffect } from 'react';
import { ModelVersion } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { BrainCircuit, RotateCcw, ShieldCheck, CheckCircle2, History } from 'lucide-react';

export const ModelsRegistryPage: React.FC = () => {
  const { role } = useAuth();
  const [models, setModels] = useState<ModelVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchModels = async () => {
    try {
      const data = await api.getModels();
      setModels(data);
    } catch (e) {
      console.error('Failed to load models', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const handleRollback = async (modelId: string) => {
    if (!confirm('Are you sure you want to trigger a rollback for this model version?')) return;
    try {
      await api.rollbackModel(modelId);
      await fetchModels();
      alert('Model marked as ROLLED_BACK in the registry.');
    } catch (e) {
      alert('Rollback failed: ' + e);
    }
  };

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Header */}
      <div>
        <h1 className="text-base font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
          <BrainCircuit className="w-5 h-5 text-cyan-400" />
          AI &amp; STATISTICAL MODEL REGISTRY
        </h1>
        <p className="text-slate-400 mt-1">
          Traceable model deployment records, algorithm versions, verification metrics, and rollback management.
        </p>
      </div>

      {/* Model Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {models.map((m) => (
          <div key={m.id} className="bg-defense-900 border border-defense-700/80 rounded-lg p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-defense-800">
                <span className="text-[10px] text-slate-400 uppercase">{m.model_type}</span>
                <StatusBadge status={m.status} size="sm" />
              </div>

              <h2 className="font-bold text-slate-100 text-sm mt-3">{m.model_name}</h2>
              <div className="text-cyan-400 mt-0.5">Version {m.version}</div>

              {/* Metrics & Parameters */}
              <div className="mt-4 bg-defense-950 p-3 rounded border border-defense-850 space-y-1.5">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                  Verification Metrics:
                </div>
                {Object.entries(m.metrics || {}).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-slate-400">{k}:</span>
                    <span className="text-slate-200 font-semibold">{String(v)}</span>
                  </div>
                ))}
              </div>

              <div className="mt-3 text-[11px] text-slate-400">
                Trained: {new Date(m.training_date).toLocaleDateString()}
              </div>
            </div>

            {role === 'ADMIN' && m.status === 'ACTIVE' && (
              <button
                onClick={() => handleRollback(m.id)}
                className="mt-4 w-full flex items-center justify-center gap-2 py-1.5 rounded bg-defense-800 hover:bg-amber-950 hover:text-amber-300 text-slate-300 border border-defense-700 hover:border-amber-700 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Rollback Version
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
