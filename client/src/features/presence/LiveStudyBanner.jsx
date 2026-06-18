import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePresence } from './usePresence';
import { useAuthStore } from '../../store';

function formatStudyDuration(startedAt) {
  if (!startedAt) return '';
  const start = typeof startedAt === 'string' ? new Date(startedAt) : startedAt?.toDate?.() || new Date(startedAt);
  const mins  = Math.floor((Date.now() - start.getTime()) / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function LiveStudyBanner() {
  const partner         = useAuthStore(s => s.partner);
  const { partnerPresence } = usePresence();
  const [duration, setDuration] = useState('');

  useEffect(() => {
    if (!partnerPresence?.isStudying) return;
    const tick = () => setDuration(formatStudyDuration(partnerPresence.startedAt));
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [partnerPresence?.isStudying, partnerPresence?.startedAt]);

  const isStudying = partnerPresence?.isStudying;

  return (
    <AnimatePresence>
      {isStudying && (
        <motion.div
          initial={{ opacity: 0, y: -16, height: 0 }}
          animate={{ opacity: 1, y: 0,   height: 'auto' }}
          exit={{   opacity: 0, y: -16, height: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="overflow-hidden"
        >
          <div className="relative mx-4 mt-3 mb-0 rounded-xl border border-purple-500/30 bg-purple-500/5 backdrop-blur-sm overflow-hidden">
            {/* animated gradient border */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/10 via-cyan-500/10 to-purple-500/10 animate-pulse pointer-events-none" />
            <div className="relative flex items-center gap-3 px-4 py-2.5">
              <div className="relative">
                <span className="text-xl">💜</span>
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full animate-ping" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-purple-200 truncate">
                  <span className="text-white">{partner?.displayName || 'Partner'}</span>
                  {' is studying '}
                  <span className="text-cyan-300 font-semibold">
                    {partnerPresence.subject || '…'}
                  </span>
                  {partnerPresence.chapter && (
                    <span className="text-slate-400"> · {partnerPresence.chapter}</span>
                  )}
                </p>
              </div>
              {duration && (
                <span className="text-xs font-mono text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full shrink-0">
                  {duration}
                </span>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
