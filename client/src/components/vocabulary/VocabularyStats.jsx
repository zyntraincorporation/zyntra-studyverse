// client/src/components/vocabulary/VocabularyStats.jsx
// Mini stats bar shown at the top of VocabularyPage
// Shows: total words, mastered, due today, current streak

import { motion } from 'framer-motion';
import { useVocabularyWords, useRevisionQueue } from '../../hooks/vocabulary/useVocabularyWords';
import { useStreakData } from '../../hooks/vocabulary/useVocabularyStats';

export default function VocabularyStats() {
  const { data: allWords }   = useVocabularyWords({});
  const { data: queue = [] } = useRevisionQueue();
  const { data: streak }     = useStreakData();

  // All accesses guarded with optional chaining and fallback values
  const total    = allWords?.total    ?? allWords?.words?.length ?? 0;
  const mastered = allWords?.words?.filter(w => (w?.masteryLevel ?? 0) >= 80)?.length ?? 0;
  const due      = Array.isArray(queue) ? queue.length : 0;
  const fire     = streak?.currentStreak ?? 0;

  const stats = [
    { label: 'Total',    value: total,      icon: '📚', color: 'from-cyan-500 to-blue-600' },
    { label: 'Mastered', value: mastered,   icon: '⭐', color: 'from-emerald-500 to-teal-600' },
    { label: 'Due',      value: due,        icon: '🔔', color: 'from-amber-500 to-orange-600' },
    { label: 'Streak',   value: `${fire}d`, icon: '🔥', color: 'from-rose-500 to-pink-600' },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 px-4 mt-4">
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          className="relative rounded-xl border border-white/10 bg-white/3 p-2.5 overflow-hidden text-center"
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${s.color} opacity-[0.07]`} />
          <p className="text-base">{s.icon}</p>
          <p className={`text-lg font-bold bg-gradient-to-r ${s.color} bg-clip-text text-transparent`}>
            {s.value}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">{s.label}</p>
        </motion.div>
      ))}
    </div>
  );
}