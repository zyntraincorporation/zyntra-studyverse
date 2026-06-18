import { useState, useEffect } from 'react';
import { Save, Trash2, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore, useUIStore } from '../store';
import { saveNote, getTodayNote, getNotes, deleteNote } from '../firebase/db';
import { getBSTDateString } from '../lib/bst';

export default function NotesPage() {
  const user  = useAuthStore(s => s.user);
  const toast = useUIStore(s => s.toast);
  const today = getBSTDateString();

  const [content,   setContent]   = useState('');
  const [saving,    setSaving]    = useState(false);
  const [notes,     setNotes]     = useState([]);
  const [loadMore,  setLoadMore]  = useState(false);
  const [lastDoc,   setLastDoc]   = useState(null);
  const [hasMore,   setHasMore]   = useState(false);
  const [expanded,  setExpanded]  = useState(null);

  // Load today's note
  useEffect(() => {
    if (!user?.uid) return;
    getTodayNote(user.uid, today).then(n => {
      if (n) setContent(n.content || '');
    }).catch(() => {});
  }, [user?.uid, today]);

  // Load note history
  useEffect(() => {
    if (!user?.uid) return;
    getNotes(user.uid, 20).then(({ items, lastDoc: ld, hasMore: hm }) => {
      setNotes(items);
      setLastDoc(ld);
      setHasMore(hm);
    }).catch(() => {});
  }, [user?.uid]);

  const handleSave = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      await saveNote(user.uid, today, content.trim());
      toast('Note saved ✅', 'success');
      // Refresh history
      getNotes(user.uid, 20).then(({ items }) => setNotes(items)).catch(() => {});
    } catch { toast('Failed to save', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (date) => {
    if (!window.confirm('Delete this note?')) return;
    try {
      await deleteNote(user.uid, date);
      setNotes(n => n.filter(x => x.date !== date));
      if (date === today) setContent('');
      toast('Note deleted', 'info');
    } catch { toast('Failed to delete', 'error'); }
  };

  const handleLoadMore = async () => {
    if (!lastDoc) return;
    setLoadMore(true);
    try {
      const { items, lastDoc: ld, hasMore: hm } = await getNotes(user.uid, 20, lastDoc);
      setNotes(n => [...n, ...items]);
      setLastDoc(ld);
      setHasMore(hm);
    } finally { setLoadMore(false); }
  };

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-6 pb-24">
      {/* Today's note */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-cyan-400" />
            <h2 className="text-sm font-semibold text-white">Today's Note</h2>
            <span className="text-xs text-slate-500">{today}</span>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !content.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white text-sm font-medium disabled:opacity-40 transition-all"
          >
            <Save size={13} />
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
        <textarea
          rows={8}
          placeholder={`What did you study today?\n\nWrite anything — topics covered, insights, things to remember…`}
          value={content}
          onChange={e => setContent(e.target.value)}
          className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-white text-sm placeholder-slate-700 focus:outline-none focus:border-cyan-500/30 resize-none leading-relaxed"
        />
        <p className="text-xs text-slate-600 mt-2 text-right">{content.length} chars · Auto-saved on Save click</p>
      </div>

      {/* History */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-3">Previous Notes</h3>
        {notes.length === 0 ? (
          <div className="text-center py-8 text-slate-600 text-sm">No notes yet. Start writing!</div>
        ) : (
          <div className="space-y-2">
            {notes.filter(n => n.date !== today).map(n => (
              <div key={n.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                <button
                  onClick={() => setExpanded(expanded === n.id ? null : n.id)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/[0.03] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileText size={14} className="text-slate-600 shrink-0" />
                    <span className="text-sm text-slate-300">{n.date}</span>
                    <span className="text-xs text-slate-600 truncate max-w-[180px]">
                      {(n.content || '').slice(0, 60)}…
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(n.date); }}
                      className="p-1 text-slate-600 hover:text-red-400 transition-colors"
                    ><Trash2 size={13} /></button>
                    {expanded === n.id ? <ChevronUp size={14} className="text-slate-600" /> : <ChevronDown size={14} className="text-slate-600" />}
                  </div>
                </button>
                <AnimatePresence>
                  {expanded === n.id && (
                    <motion.div
                      initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                      className="overflow-hidden border-t border-white/[0.06]"
                    >
                      <p className="px-4 py-3 text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{n.content}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
            {hasMore && (
              <button
                onClick={handleLoadMore}
                disabled={loadMore}
                className="w-full py-2.5 text-sm text-slate-500 hover:text-slate-300 border border-white/[0.06] rounded-xl transition-colors"
              >
                {loadMore ? 'Loading…' : 'Load more'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
