import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { FileText, Download, Eye, Calendar, RefreshCw } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [reportTypes, setReportTypes] = useState<{ key: string; title: string; default_days: number }[]>([]);
  const [selectedType, setSelectedType] = useState<string>('daily_health');
  const [days, setDays] = useState<number>(1);
  const [htmlPreview, setHtmlPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadTypes = async () => {
      try {
        const types = await api.getReportTypes();
        setReportTypes(types);
      } catch (e) {
        console.error('Failed to load report types', e);
      }
    };
    loadTypes();
  }, []);

  const handlePreview = async () => {
    setIsLoading(true);
    try {
      const html = await api.generateReport(selectedType, 'html', days);
      setHtmlPreview(html);
    } catch (e) {
      alert('Failed to generate report: ' + e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    const url = api.getPdfReportUrl(selectedType, days);
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Header */}
      <div>
        <h1 className="text-base font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
          <FileText className="w-5 h-5 text-cyan-400" />
          TURRET CONDITION & HEALTH REPORTS GENERATOR
        </h1>
        <p className="text-slate-400 mt-1">
          Export formal engineering condition documentation, baseline comparisons, and maintenance recommendations in HTML or PDF.
        </p>
      </div>

      {/* Report Configuration Controls */}
      <div className="bg-defense-900 border border-defense-700/80 rounded-lg p-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-slate-400 mb-1">Report Category:</label>
          <select
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value);
              const found = reportTypes.find((t) => t.key === e.target.value);
              if (found) setDays(found.default_days);
            }}
            className="bg-defense-950 border border-defense-700 text-slate-200 rounded px-3 py-1.5 w-64"
          >
            {reportTypes.map((t) => (
              <option key={t.key} value={t.key}>
                {t.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-slate-400 mb-1">Time Window (Days):</label>
          <input
            type="number"
            min="1"
            max="90"
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value) || 1)}
            className="bg-defense-950 border border-defense-700 text-slate-200 rounded px-3 py-1.5 w-24"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handlePreview}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 transition-colors"
          >
            <Eye className="w-4 h-4" />
            {isLoading ? 'Compiling...' : 'Generate Preview'}
          </button>

          <button
            onClick={handleDownloadPdf}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export PDF Document
          </button>
        </div>
      </div>

      {/* HTML Report Preview Iframe */}
      {htmlPreview ? (
        <div className="bg-defense-900 border border-defense-700/80 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3 text-slate-400">
            <span>LIVE DOCUMENT PREVIEW</span>
            <span className="text-[11px] text-cyan-400">Rendered HTML View</span>
          </div>
          <div className="w-full h-[650px] border border-defense-800 rounded bg-white overflow-hidden">
            <iframe
              title="Report Preview"
              srcDoc={htmlPreview}
              className="w-full h-full border-none"
            />
          </div>
        </div>
      ) : (
        <div className="bg-defense-900 border border-defense-700/80 rounded-lg p-12 text-center text-slate-400">
          <FileText className="w-10 h-10 mx-auto mb-3 text-slate-400" />
          <p>Select a report template above and click "Generate Preview" to review the document.</p>
        </div>
      )}
    </div>
  );
};
