import { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, Clock, TrendingUp, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore, useUIStore } from '../store';
import { generateAndSaveAIReport, getAllAIReports, getLatestAIReport } from '../firebase/db';
import { getBSTDateString } from '../lib/bst';

function ReportCard({ report, isLatest }) {
  const [expanded, setExpanded] = useState(isLatest);
  const ts = report.generatedAt?.toDate?.() || new Date();
  const timeStr = ts.toLocaleString('en-BD', { timeZone: 'Asia/Dhaka', dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div className={`rounded-2xl border ${isLatest ? 'border-cyan-500/20 bg-cyan-500/[0.03]' : 'border-white/[0.06] bg-white/[0.01]'} overflow-hidden`}>
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isLatest ? 'bg-cyan-500/20' : 'bg-white/5'}`}>
            <Sparkles size={15} className={isLatest ? 'text-cyan-400' : 'text-slate-500'} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">AI Analysis</span>
              {isLatest && <span className="text-[10px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded-full border border-cyan-500/20">Latest</span>}
            </div>
            <p className="text-xs text-slate-500">{timeStr}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {report.score != null && (
            <div className="text-right">
              <p className={`text-xl font-bold ${report.score >= 70 ? 'text-green-400' : report.score >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                {report.score}
              </p>
              <p className="text-[10px] text-slate-600">/100</p>
            </div>
          )}
          <span className={`text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`}>▾</span>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            className="overflow-hidden border-t border-white/[0.06]"
          >
            <div className="px-5 py-4">
              <div className="prose prose-invert prose-sm max-w-none">
                <pre className="whitespace-pre-wrap text-sm text-slate-300 leading-relaxed font-sans">
                  {report.reportText}
                </pre>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AIReportPage() {
  const user  = useAuthStore(s => s.user);
  const toast = useUIStore(s => s.toast);
  const [reports,    setReports]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [generating, setGenerating] = useState(false);
  const [days,       setDays]       = useState(7);

  useEffect(() => {
    if (!user?.uid) return;
    getAllAIReports(user.uid).then(r => {
      setReports(r);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user?.uid]);

  const handleGenerate = async () => {
    if (!import.meta.env.VITE_OPENROUTER_API_KEY) {
      toast('Set VITE_OPENROUTER_API_KEY in .env to use AI reports', 'error');
      return;
    }
    setGenerating(true);
    try {
      const result = await generateAndSaveAIReport(user.uid, days);
      setReports(prev => [{ ...result, id: result.id, generatedAt: { toDate: () => new Date() } }, ...prev]);
      toast('AI report generated! 🤖', 'success');
    } catch (err) {
      toast(`Failed: ${err.message}`, 'error');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-5 pb-24">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles size={20} className="text-purple-400" /> AI Mentor
          </h2>
          <p className="text-sm text-slate-500 mt-1">Personalized study analysis in Bengali 🇧🇩</p>
        </div>
      </div>

      {/* Generate panel */}
      <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-950/40 to-indigo-950/30 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <Sparkles size={18} className="text-purple-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Generate New Report</p>
            <p className="text-xs text-slate-500">ZYNTRA AI analyzes your study data and responds in Bengali</p>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <label className="text-xs text-slate-400 shrink-0">Analyze last</label>
          <div className="flex gap-1.5">
            {[7, 14, 30].map(d => (
              <button key={d} onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-xl text-xs border transition-all ${days === d ? 'bg-purple-500/20 border-purple-500/30 text-purple-300' : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white'}`}
              >{d} days</button>
            ))}
          </div>
        </div>

        {!import.meta.env.VITE_OPENROUTER_API_KEY && (
          <div className="flex items-start gap-2 mb-3 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <AlertCircle size={14} className="text-yellow-400 shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-400">
              Add <code className="bg-yellow-500/20 px-1 rounded">VITE_OPENROUTER_API_KEY</code> to your <code>.env</code> file to enable AI reports.
            </p>
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold text-sm
                     hover:from-purple-400 hover:to-indigo-500 disabled:opacity-50 shadow-[0_0_20px_rgba(168,85,247,0.2)]
                     transition-all flex items-center justify-center gap-2"
        >
          {generating ? (
            <><RefreshCw size={16} className="animate-spin" /> Analyzing data…</>
          ) : (
            <><Sparkles size={16} /> Generate AI Report</>
          )}
        </button>
      </div>

      {/* Reports list */}
      <div>
        <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
          <Clock size={14} /> Report History
        </h3>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-7 h-7 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12 text-slate-600">
            <Sparkles size={40} className="mx-auto mb-3 opacity-30" />
            <p>No reports yet. Generate your first one!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((r, i) => <ReportCard key={r.id} report={r} isLatest={i === 0} />)}
          </div>
        )}
      </div>
    </div>
  );
}
