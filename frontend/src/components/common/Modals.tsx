import React, { useState } from 'react';
import { Alert, Subsystem } from '../../types';
import { X, AlertTriangle, CheckCircle, Wrench } from 'lucide-react';

interface AcknowledgeModalProps {
  alert: Alert;
  onClose: () => void;
  onConfirm: (notes?: string) => Promise<void>;
}

export const AcknowledgeModal: React.FC<AcknowledgeModalProps> = ({ alert, onClose, onConfirm }) => {
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onConfirm(notes);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-defense-900 border border-defense-700 rounded-lg max-w-md w-full p-6 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-defense-800">
          <div className="flex items-center gap-2 text-amber-400 font-mono font-bold text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>ACKNOWLEDGE ALERT</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="my-4 text-xs font-mono space-y-2 bg-defense-950 p-3 rounded border border-defense-800">
          <div><span className="text-slate-400">Subsystem:</span> <span className="text-slate-200">{alert.subsystem_name || alert.subsystem_id}</span></div>
          <div><span className="text-slate-400">Feature:</span> <span className="text-cyan-400">{alert.feature_name}</span></div>
          <div><span className="text-slate-400">Probable Condition:</span> <span className="text-amber-300">{alert.probable_issue}</span></div>
          <div><span className="text-slate-400">Current / Baseline:</span> <span className="text-slate-200">{alert.current_value} / {alert.baseline_value}</span></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">
              Technician Initial Notes / Diagnostic Assessment:
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Visual check scheduled; sensor verified operational."
              className="w-full h-24 bg-defense-950 border border-defense-700 rounded p-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded font-mono text-xs text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded font-mono text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-colors"
            >
              {isSubmitting ? 'Recording...' : 'Confirm Acknowledgment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface ResolveModalProps {
  alert: Alert;
  onClose: () => void;
  onConfirm: (resolutionNotes: string) => Promise<void>;
}

export const ResolveModal: React.FC<ResolveModalProps> = ({ alert, onClose, onConfirm }) => {
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolutionNotes.trim()) return;
    setIsSubmitting(true);
    try {
      await onConfirm(resolutionNotes);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-defense-900 border border-defense-700 rounded-lg max-w-md w-full p-6 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-defense-800">
          <div className="flex items-center gap-2 text-emerald-400 font-mono font-bold text-sm">
            <CheckCircle className="w-4 h-4" />
            <span>RESOLVE ALERT</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">
              Required Maintenance Resolution Notes:
            </label>
            <textarea
              required
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="e.g. Relubricated bearing race. Telemetry re-established within baseline mean."
              className="w-full h-24 bg-defense-950 border border-defense-700 rounded p-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded font-mono text-xs text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !resolutionNotes.trim()}
              className="px-4 py-1.5 rounded font-mono text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition-colors"
            >
              {isSubmitting ? 'Closing Alert...' : 'Mark Resolved'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface MaintenanceModalProps {
  subsystems: Subsystem[];
  defaultSubsystemId?: string;
  onClose: () => void;
  onConfirm: (data: any) => Promise<void>;
}

export const MaintenanceModal: React.FC<MaintenanceModalProps> = ({
  subsystems,
  defaultSubsystemId,
  onClose,
  onConfirm,
}) => {
  const [subsystemId, setSubsystemId] = useState(defaultSubsystemId || subsystems[0]?.id || '');
  const [eventType, setEventType] = useState('INSPECTION');
  const [priority, setPriority] = useState('HIGH');
  const [description, setDescription] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    setIsSubmitting(true);
    try {
      await onConfirm({
        subsystem_id: subsystemId,
        event_type: eventType,
        description,
        maintenance_priority: priority,
        recommendations: recommendations.trim() || undefined,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-defense-900 border border-defense-700 rounded-lg max-w-lg w-full p-6 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-defense-800">
          <div className="flex items-center gap-2 text-cyan-400 font-mono font-bold text-sm">
            <Wrench className="w-4 h-4" />
            <span>CREATE MAINTENANCE WORK ORDER</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-xs font-mono">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Target Subsystem:</label>
              <select
                value={subsystemId}
                onChange={(e) => setSubsystemId(e.target.value)}
                className="w-full bg-defense-950 border border-defense-700 rounded p-2 text-slate-200"
              >
                {subsystems.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Event Type:</label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="w-full bg-defense-950 border border-defense-700 rounded p-2 text-slate-200"
              >
                <option value="INSPECTION">INSPECTION</option>
                <option value="LUBRICATION">LUBRICATION</option>
                <option value="CALIBRATION">CALIBRATION</option>
                <option value="COMPONENT_REPLACEMENT">COMPONENT_REPLACEMENT</option>
                <option value="REBASELINE">REBASELINE</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Priority:</label>
            <div className="flex gap-2">
              {['LOW', 'MEDIUM', 'HIGH', 'IMMEDIATE'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`flex-1 py-1 rounded text-center border font-semibold ${
                    priority === p
                      ? p === 'IMMEDIATE'
                        ? 'bg-red-500/20 border-red-500 text-red-400'
                        : p === 'HIGH'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                        : 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                      : 'bg-defense-950 border-defense-700 text-slate-400'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Work Description:</label>
            <textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Conducted non-destructive ultrasonic inspection of bearing race."
              className="w-full h-20 bg-defense-950 border border-defense-700 rounded p-2 text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Maintenance Recommendations:</label>
            <input
              type="text"
              value={recommendations}
              onChange={(e) => setRecommendations(e.target.value)}
              placeholder="e.g. Schedule authorized maintenance inspection within 50 operating hours."
              className="w-full bg-defense-950 border border-defense-700 rounded p-2 text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-defense-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !description.trim()}
              className="px-4 py-1.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 transition-colors"
            >
              {isSubmitting ? 'Logging...' : 'Submit Work Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
