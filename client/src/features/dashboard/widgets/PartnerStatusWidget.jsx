import { useEffect, useState } from 'react';
import { useAuthStore } from '../../../store';
import { subscribeToPartnerPresence } from '../../../firebase/db';

function elapsed(startedAt) {
  if (!startedAt) return '';
  const start = typeof startedAt === 'string' ? new Date(startedAt) : startedAt?.toDate?.() || new Date(startedAt);
  const m = Math.floor((Date.now() - start) / 60000);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m/60)}h ${m%60}m`;
}

export default function PartnerStatusWidget() {
  const partner = useAuthStore(s => s.partner);
  const [presence, setPresence] = useState(null);
  const [tick,     setTick]     = useState(0);

  useEffect(() => {
    if (!partner?.uid) return;
    const unsub = subscribeToPartnerPresence(partner.uid, setPresence);
    return unsub;
  }, [partner?.uid]);

  // Refresh duration every minute
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const isStudying = presence?.isStudying;

  return (
    <div className={`h-full rounded-2xl border p-4 flex flex-col transition-all duration-500 ${
      isStudying
        ? 'bg-gradient-to-br from-purple-950/60 to-pink-950/40 border-purple-500/30'
        : 'bg-white/[0.03] border-white/10'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] text-slate-500 uppercase tracking-widest">Partner</p>
        <div className={`w-2 h-2 rounded-full ${isStudying ? 'bg-green-400 animate-pulse' : 'bg-slate-700'}`} />
      </div>

      {!partner ? (
        <div className="flex-1 flex items-center justify-center text-slate-600 text-sm">No partner linked</div>
      ) : isStudying ? (
        <div className="flex-1 flex flex-col justify-center gap-2">
          <p className="text-lg font-bold text-white">💜 {partner.displayName}</p>
          <p className="text-sm text-purple-300">Studying <span className="font-semibold">{presence.subject}</span></p>
          {presence.chapter && <p className="text-xs text-slate-500">{presence.chapter}</p>}
          <span className="text-xs font-mono text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full self-start">
            {elapsed(presence.startedAt)} elapsed
          </span>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-600">
          <span className="text-3xl">😴</span>
          <p className="text-sm text-center">Waiting for {partner.displayName}…</p>
          {presence?.studyMinutesToday > 0 && (
            <p className="text-xs text-slate-600">
              {Math.floor(presence.studyMinutesToday / 60)}h {presence.studyMinutesToday % 60}m studied today
            </p>
          )}
        </div>
      )}
    </div>
  );
}
