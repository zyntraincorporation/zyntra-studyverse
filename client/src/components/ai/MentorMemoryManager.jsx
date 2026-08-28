import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Plus, Edit3, Trash2, ToggleLeft, ToggleRight,
  X, Save, AlertTriangle, Loader, ChevronDown, ChevronUp,
  Info, Zap, BookOpen,
} from 'lucide-react';
import {
  addMentorMemory, updateMentorMemory, deleteMentorMemory,
} from '../../firebase/db';

// ─────────────────────────────────────────────────────────────────────────────
// MentorMemoryManager — AI Mentor Custom Instructions / Memory System
// Allows user to add, edit, delete, enable/disable memories
// These are injected into every AI request as Layer 3 context
// ─────────────────────────────────────────────────────────────────────────────

const MAX_MEMORY_CONTENT_CHARS    = 800;
const MAX_GUIDELINE_CONTENT_CHARS = 2000;
const MAX_MEMORY_TITLE_CHARS      = 80;
const MAX_TOTAL_CHARS             = 4000;  // memory total
const MAX_GUIDELINE_TOTAL_CHARS   = 12000; // guideline total
const WARN_THRESHOLD              = 0.80;  // warn at 80% of total limit

function formatTimestamp(firestoreTs) {
  if (!firestoreTs) return '';
  try {
    const d = firestoreTs.toDate ? firestoreTs.toDate() : new Date(firestoreTs);
    return d.toLocaleDateString('en-BD', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return ''; }
}

// ── Context size meter ────────────────────────────────────────────────────────
function ContextMeter({ memories, maxChars = MAX_TOTAL_CHARS, label = 'memories' }) {
  const active    = memories.filter(m => m.active);
  const totalChars = active.reduce((s, m) => s + (m.content?.length || 0) + (m.title?.length || 0), 0);
  const pct        = Math.min(100, Math.round((totalChars / maxChars) * 100));
  const isWarn     = totalChars / maxChars >= WARN_THRESHOLD;
  const isMax      = totalChars >= maxChars;

  return (
    <div className="bg-white/[0.025] border border-white/[0.06] rounded-xl px-4 py-3 mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] text-slate-500 uppercase tracking-wide font-medium">
          AI Context Usage
        </span>
        <span className={`text-[11px] font-semibold ${
          isMax  ? 'text-red-400'   :
          isWarn ? 'text-amber-400' :
                   'text-slate-400'
        }`}>
          {totalChars.toLocaleString()} / {maxChars.toLocaleString()} chars
        </span>
      </div>
      <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5 }}
          className={`h-full rounded-full ${
            isMax  ? 'bg-red-500'                  :
            isWarn ? 'bg-amber-500'                :
                     'bg-gradient-to-r from-cyan-500 to-blue-500'
          }`}
        />
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[10px] text-slate-600">
          {active.length} active {label}
        </span>
        {isWarn && (
          <span className={`text-[10px] flex items-center gap-1 ${isMax ? 'text-red-400' : 'text-amber-400'}`}>
            <AlertTriangle size={9} />
            {isMax ? 'Context limit reached' : 'Approaching limit'}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ onAdd }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-14 text-center"
    >
      <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20
                      flex items-center justify-center mb-4">
        <Brain size={24} className="text-violet-400" />
      </div>
      <h3 className="text-white font-semibold mb-2">No Memories Yet</h3>
      <p className="text-slate-500 text-sm max-w-xs mb-5 leading-relaxed">
        Exam dates, current weaknesses, study strategies — AI Mentor সব মনে রাখবে।
        তুমি manually add করো, AI শুধু read করে।
      </p>
      <button
        onClick={onAdd}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl
                   bg-gradient-to-r from-violet-500 to-purple-600
                   hover:from-violet-400 hover:to-purple-500
                   text-white font-medium text-sm transition-all"
      >
        <Plus size={15} />
        Add First Memory
      </button>
    </motion.div>
  );
}

// ── Delete confirmation modal ─────────────────────────────────────────────────
function DeleteConfirmModal({ memory, onConfirm, onCancel, deleting }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.93, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.93, opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm bg-[#111827] border border-white/[0.10] rounded-2xl p-6 shadow-2xl"
      >
        <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/25
                        flex items-center justify-center mb-4">
          <Trash2 size={18} className="text-red-400" />
        </div>
        <h3 className="text-white font-semibold text-base mb-1">Delete this memory?</h3>
        {memory?.title && (
          <p className="text-slate-400 text-sm font-medium mb-2">"{memory.title}"</p>
        )}
        <p className="text-slate-500 text-sm leading-relaxed mb-6">
          This information will no longer be provided to your AI Mentor.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 py-2.5 rounded-xl border border-white/[0.10] text-slate-400
                       hover:text-white hover:border-white/20 transition-all text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30
                       text-red-400 hover:bg-red-500/30 transition-all text-sm font-medium
                       flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {deleting ? <Loader size={14} className="animate-spin" /> : <Trash2 size={14} />}
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Add / Edit Modal ──────────────────────────────────────────────────────────
function MemoryFormModal({ memory, onSave, onClose, saving, isGuideline = false }) {
  const isEdit     = !!memory?.id;
  const maxContent = isGuideline ? MAX_GUIDELINE_CONTENT_CHARS : MAX_MEMORY_CONTENT_CHARS;
  const [title,   setTitle]   = useState(memory?.title   || '');
  const [content, setContent] = useState(memory?.content || '');
  const [active,  setActive]  = useState(memory?.active  !== false);

  const contentLen = content.length;
  const contentOk  = contentLen > 0 && contentLen <= maxContent;
  const titleOk    = title.length <= MAX_MEMORY_TITLE_CHARS;

  const handleSave = () => {
    if (!contentOk || !titleOk || saving) return;
    onSave({ title: title.trim(), content: content.trim(), active });
  };

  const accentClass = isGuideline
    ? 'border-emerald-500/40 bg-emerald-500/[0.06]'
    : 'border-violet-500/40 bg-white/[0.06]';
  const iconBg = isGuideline
    ? 'bg-emerald-500/20 border-emerald-500/25'
    : 'bg-violet-500/20 border-violet-500/25';
  const btnClass = isGuideline
    ? 'from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500'
    : 'from-violet-500 to-purple-600 hover:from-violet-400 hover:to-purple-500';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        onClick={e => e.stopPropagation()}
        className="w-full sm:max-w-lg bg-[#111827] border border-white/[0.10]
                   rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
          <div className="flex items-center gap-2.5">
            <div className={`w-7 h-7 rounded-lg ${iconBg} flex items-center justify-center`}>
              {isGuideline
                ? <BookOpen size={14} className="text-emerald-400" />
                : <Brain size={14} className="text-violet-400" />}
            </div>
            <h3 className="text-white font-semibold text-sm">
              {isEdit
                ? (isGuideline ? 'Edit Guideline' : 'Edit Memory')
                : (isGuideline ? 'Add Study Guideline' : 'Add Memory')}
            </h3>
          </div>
          <button onClick={onClose} disabled={saving}
            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.06] transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {isGuideline && (
          <div className="mx-5 mt-4 flex items-start gap-2 p-3 rounded-xl bg-emerald-500/[0.05] border border-emerald-500/20">
            <Info size={12} className="text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Guidelines are <span className="text-emerald-300 font-medium">high-priority rules</span> for the AI — study strategies, video notes, preparation methods. AI will always follow these when advising you. Max {maxContent} chars.
            </p>
          </div>
        )}

        <div className="p-5 space-y-4">
          {/* Title */}
          <div>
            <label className="text-[11px] text-slate-500 uppercase tracking-wide font-medium block mb-1.5">
              Title <span className="normal-case text-slate-600">(optional)</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value.slice(0, MAX_MEMORY_TITLE_CHARS))}
              placeholder={isGuideline
                ? 'e.g. "BUET Preparation Strategy", "Physics Study Method"'
                : 'e.g. "Current Physics Problem", "Exam Dates"'}
              className={`w-full bg-white/[0.04] border border-white/[0.09] rounded-xl px-4 py-2.5 text-sm
                         text-white placeholder-slate-600 focus:outline-none focus:${accentClass}
                         transition-all`}
            />
            {title.length > MAX_MEMORY_TITLE_CHARS - 10 && (
              <p className="text-[10px] text-amber-500 mt-1">
                {title.length} / {MAX_MEMORY_TITLE_CHARS}
              </p>
            )}
          </div>

          {/* Content */}
          <div>
            <label className="text-[11px] text-slate-500 uppercase tracking-wide font-medium block mb-1.5">
              Content <span className="text-red-400">*</span>
            </label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value.slice(0, maxContent))}
              placeholder={isGuideline
                ? 'e.g. BUET Reality:\n- 10,000 shortlist থেকে 600 নম্বর written\n- Physics=Chemistry=Math সমান নম্বর\n- Chapter difficulty: Physics Ch4,8,9...\n\nPreparation Strategy:\nStep 1 → Concept clear...'
                : 'e.g. My HSC preparation deadline is December 31, 2026.\nHSC exam starts March 2027.\nI am currently struggling with Physics numericals...'}
              rows={isGuideline ? 10 : 6}
              className="w-full bg-white/[0.04] border border-white/[0.09] rounded-xl px-4 py-3 text-sm
                         text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/40
                         focus:bg-white/[0.06] transition-all resize-none leading-relaxed"
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-[10px] text-slate-600">
                {isGuideline
                  ? 'AI will follow these rules in every response'
                  : 'AI Mentor will always read this when you chat or generate analysis'}
              </p>
              <span className={`text-[10px] font-medium ${
                contentLen > maxContent * 0.9 ? 'text-amber-400' : 'text-slate-600'
              }`}>
                {contentLen} / {maxContent}
              </span>
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between py-2.5 px-4 rounded-xl
                          bg-white/[0.03] border border-white/[0.06]">
            <div>
              <p className="text-sm text-white font-medium">Active</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Inactive {isGuideline ? 'guidelines' : 'memories'} are saved but not sent to AI
              </p>
            </div>
            <button
              onClick={() => setActive(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                active
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : 'bg-white/[0.04] border-white/[0.09] text-slate-500'
              }`}
            >
              {active ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
              {active ? 'Enabled' : 'Disabled'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-5 pb-5">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl border border-white/[0.10] text-slate-400
                       hover:text-white hover:border-white/20 transition-all text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!contentOk || !titleOk || saving}
            className={`flex-1 py-2.5 rounded-xl bg-gradient-to-r ${btnClass} disabled:opacity-40
                       disabled:cursor-not-allowed text-white text-sm font-medium
                       flex items-center justify-center gap-2 transition-all`}
          >
            {saving ? (
              <><Loader size={14} className="animate-spin" /> Saving…</>
            ) : (
              <><Save size={14} /> {isEdit ? 'Save Changes' : (isGuideline ? 'Add Guideline' : 'Add Memory')}</>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}


// ── Single memory card ────────────────────────────────────────────────────────
function MemoryCard({ memory, onEdit, onDelete, onToggle, idx, toggling }) {
  const [expanded, setExpanded] = useState(false);
  const isActive  = memory.active !== false;
  const isLong    = (memory.content || '').length > 160;
  const preview   = isLong && !expanded
    ? memory.content.slice(0, 160).trimEnd() + '…'
    : memory.content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ delay: idx * 0.04 }}
      className={`rounded-xl border overflow-hidden transition-all ${
        isActive
          ? 'bg-white/[0.025] border-white/[0.08]'
          : 'bg-white/[0.01] border-white/[0.04] opacity-60'
      }`}
    >
      {/* Card header */}
      <div className="flex items-start gap-3 px-4 py-3.5">
        {/* Status dot */}
        <div className="mt-0.5 shrink-0">
          {isActive ? (
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Active
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] text-slate-600 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
              Disabled
            </span>
          )}
        </div>

        {/* Title + content */}
        <div className="flex-1 min-w-0">
          {memory.title ? (
            <p className="text-[13px] font-semibold text-white mb-1 leading-snug">
              {memory.title}
            </p>
          ) : null}
          <p className="text-[12.5px] text-slate-400 leading-relaxed whitespace-pre-wrap break-words">
            {preview}
          </p>
          {isLong && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="flex items-center gap-1 text-[11px] text-slate-600 hover:text-cyan-400
                         mt-1 transition-colors"
            >
              {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}
          {memory.updatedAt && (
            <p className="text-[10px] text-slate-700 mt-1.5">
              Updated {formatTimestamp(memory.updatedAt)}
            </p>
          )}
        </div>
      </div>

      {/* Card actions */}
      <div className="flex items-center gap-0 border-t border-white/[0.05]">
        {/* Toggle */}
        <button
          onClick={() => onToggle(memory)}
          disabled={toggling === memory.id}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium
                     transition-colors hover:bg-white/[0.04] disabled:opacity-50 border-r border-white/[0.05]
                     text-slate-500 hover:text-white"
        >
          {toggling === memory.id ? (
            <Loader size={11} className="animate-spin" />
          ) : isActive ? (
            <><ToggleRight size={13} className="text-emerald-400" /> Disable</>
          ) : (
            <><ToggleLeft size={13} /> Enable</>
          )}
        </button>

        {/* Edit */}
        <button
          onClick={() => onEdit(memory)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium
                     transition-colors hover:bg-white/[0.04] border-r border-white/[0.05]
                     text-slate-500 hover:text-cyan-400"
        >
          <Edit3 size={11} /> Edit
        </button>

        {/* Delete */}
        <button
          onClick={() => onDelete(memory)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium
                     transition-colors hover:bg-red-500/10
                     text-slate-500 hover:text-red-400"
        >
          <Trash2 size={11} /> Delete
        </button>
      </div>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function MentorMemoryManager({ userId, memories = [] }) {
  const [activeSection, setActiveSection] = useState('memory'); // 'memory' | 'guideline'
  const [showForm,      setShowForm]      = useState(false);
  const [editMemory,    setEditMemory]    = useState(null);
  const [deleteTarget,  setDeleteTarget]  = useState(null);
  const [saving,        setSaving]        = useState(false);
  const [deleting,      setDeleting]      = useState(false);
  const [toggling,      setToggling]      = useState('');
  const [error,         setError]         = useState('');

  const isGuideline = activeSection === 'guideline';

  // Split memories and guidelines
  const memoryItems    = memories.filter(m => m.type !== 'guideline');
  const guidelineItems = memories.filter(m => m.type === 'guideline');
  const currentItems   = isGuideline ? guidelineItems : memoryItems;

  const handleAdd = () => {
    setEditMemory(null);
    setShowForm(true);
    setError('');
  };

  const handleEdit = (memory) => {
    setEditMemory(memory);
    setShowForm(true);
    setError('');
  };

  const handleSave = async ({ title, content, active }) => {
    if (!userId) return;
    setSaving(true);
    setError('');
    try {
      if (editMemory?.id) {
        await updateMentorMemory(userId, editMemory.id, { title, content, active });
      } else {
        // Pass type based on current tab
        await addMentorMemory(userId, { title, content, active, type: activeSection });
      }
      setShowForm(false);
      setEditMemory(null);
    } catch (e) {
      setError(e.message || 'Save করতে সমস্যা হয়েছে।');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (memory) => {
    if (!userId || toggling) return;
    setToggling(memory.id);
    try {
      await updateMentorMemory(userId, memory.id, { active: !memory.active });
    } catch (e) {
      setError(e.message || 'Update করতে সমস্যা হয়েছে।');
    } finally {
      setToggling('');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!userId || !deleteTarget) return;
    setDeleting(true);
    try {
      await deleteMentorMemory(userId, deleteTarget.id);
      setDeleteTarget(null);
    } catch (e) {
      setError(e.message || 'Delete করতে সমস্যা হয়েছে।');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="px-4 py-5 pb-24 space-y-4 max-w-2xl mx-auto">

      {/* Section header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              isGuideline
                ? 'bg-emerald-500/20 border border-emerald-500/25'
                : 'bg-violet-500/20 border border-violet-500/25'
            }`}>
              {isGuideline
                ? <BookOpen size={16} className="text-emerald-400" />
                : <Brain size={16} className="text-violet-400" />}
            </div>
            <h2 className="text-base font-bold text-white">
              {isGuideline ? 'Study Guidelines' : 'Memory / Custom Instructions'}
            </h2>
          </div>
          <p className="text-[12px] text-slate-500 leading-relaxed ml-[42px]">
            {isGuideline
              ? 'Your study strategies & rules — AI follows these with high priority.'
              : 'Information you want your AI Mentor to always remember and consider.'}
          </p>
        </div>
        <button
          onClick={handleAdd}
          className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl
                     text-xs font-medium transition-all ${
            isGuideline
              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 hover:border-emerald-400/40'
              : 'bg-violet-500/15 border border-violet-500/30 text-violet-300 hover:bg-violet-500/25 hover:border-violet-400/40'
          }`}
        >
          <Plus size={13} /> {isGuideline ? 'Add Guideline' : 'Add Memory'}
        </button>
      </div>

      {/* Memory ↔ Guidelines tabs */}
      <div className="flex gap-1 p-1 bg-white/[0.03] border border-white/[0.06] rounded-xl">
        <button
          onClick={() => { setActiveSection('memory'); setShowForm(false); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all ${
            !isGuideline
              ? 'bg-violet-500/20 border border-violet-500/30 text-violet-300'
              : 'text-slate-500 hover:text-white'
          }`}
        >
          <Brain size={13} />
          Memories
          {memoryItems.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
              !isGuideline ? 'bg-violet-500/30 text-violet-200' : 'bg-white/[0.08] text-slate-500'
            }`}>{memoryItems.length}</span>
          )}
        </button>
        <button
          onClick={() => { setActiveSection('guideline'); setShowForm(false); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all ${
            isGuideline
              ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
              : 'text-slate-500 hover:text-white'
          }`}
        >
          <BookOpen size={13} />
          Guidelines
          {guidelineItems.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
              isGuideline ? 'bg-emerald-500/30 text-emerald-200' : 'bg-white/[0.08] text-slate-500'
            }`}>{guidelineItems.length}</span>
          )}
        </button>
      </div>

      {/* Context pipeline info banner */}
      <div className={`flex items-start gap-2.5 p-3 rounded-xl border ${
        isGuideline
          ? 'bg-emerald-500/[0.04] border-emerald-500/[0.12]'
          : 'bg-cyan-500/[0.05] border-cyan-500/[0.12]'
      }`}>
        <Info size={13} className={`shrink-0 mt-0.5 ${isGuideline ? 'text-emerald-500/70' : 'text-cyan-500/70'}`} />
        <p className="text-[11px] text-slate-500 leading-relaxed">
          <span className="text-slate-400 font-medium">Priority order: </span>
          Fixed Prompt → DB Data →{' '}
          <span className="text-emerald-400 font-medium">Guidelines (HIGH)</span>
          {' → '}
          <span className="text-violet-400 font-medium">Memories</span>
          {' → Message → AI'}
        </p>
      </div>

      {/* Context usage meter */}
      {currentItems.length > 0 && (
        <ContextMeter
          memories={currentItems}
          maxChars={isGuideline ? MAX_GUIDELINE_TOTAL_CHARS : MAX_TOTAL_CHARS}
          label={isGuideline ? 'guidelines' : 'memories'}
        />
      )}

      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 text-xs text-red-400
                       bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5"
          >
            <AlertTriangle size={12} className="shrink-0" />
            <span>{error}</span>
            <button onClick={() => setError('')} className="ml-auto hover:text-white">
              <X size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List or empty state */}
      {currentItems.length === 0 ? (
        <motion.div
          key={activeSection}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-14 text-center"
        >
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${
            isGuideline
              ? 'bg-emerald-500/10 border border-emerald-500/20'
              : 'bg-violet-500/10 border border-violet-500/20'
          }`}>
            {isGuideline
              ? <BookOpen size={24} className="text-emerald-400" />
              : <Brain size={24} className="text-violet-400" />}
          </div>
          <h3 className="text-white font-semibold mb-2">
            {isGuideline ? 'No Guidelines Yet' : 'No Memories Yet'}
          </h3>
          <p className="text-slate-500 text-sm max-w-xs mb-5 leading-relaxed">
            {isGuideline
              ? 'Add BUET preparation strategies, chapter difficulty notes, or study methods from guideline videos.'
              : 'Exam dates, current weaknesses, study strategies — AI Mentor সব মনে রাখবে। তুমি manually add করো, AI শুধু read করে।'}
          </p>
          <button
            onClick={handleAdd}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl
                       text-white font-medium text-sm transition-all ${
              isGuideline
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500'
                : 'bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-400 hover:to-purple-500'
            }`}
          >
            <Plus size={15} />
            {isGuideline ? 'Add First Guideline' : 'Add First Memory'}
          </button>
        </motion.div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-0.5">
            <p className="text-[11px] text-slate-600 uppercase tracking-wide font-medium">
              {isGuideline ? `All Guidelines (${currentItems.length})` : `All Memories (${currentItems.length})`}
            </p>
            <span className="text-[10px] text-slate-600 flex items-center gap-1">
              <Zap size={9} className={isGuideline ? 'text-emerald-500' : 'text-violet-500'} />
              {currentItems.filter(m => m.active).length} active → sent to AI
            </span>
          </div>

          <AnimatePresence mode="popLayout">
            {currentItems.map((mem, i) => (
              <MemoryCard
                key={mem.id}
                memory={mem}
                idx={i}
                onEdit={handleEdit}
                onDelete={setDeleteTarget}
                onToggle={handleToggle}
                toggling={toggling}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add / Edit form modal */}
      <AnimatePresence>
        {showForm && (
          <MemoryFormModal
            memory={editMemory}
            onSave={handleSave}
            onClose={() => { setShowForm(false); setEditMemory(null); }}
            saving={saving}
            isGuideline={isGuideline}
          />
        )}
      </AnimatePresence>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {deleteTarget && (
          <DeleteConfirmModal
            memory={deleteTarget}
            onConfirm={handleDeleteConfirm}
            onCancel={() => setDeleteTarget(null)}
            deleting={deleting}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

