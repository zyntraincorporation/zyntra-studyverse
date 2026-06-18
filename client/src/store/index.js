import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ── Auth Store (Firebase user) ─────────────────────────────────────────────────
export const useAuthStore = create(
  persist(
    (set) => ({
      user:        null,   // Firebase auth user { uid, email, displayName }
      partner:     null,   // Partner Firestore profile
      isAuthed:    false,
      isLoading:   true,   // true until onAuthStateChanged fires first time

      setUser: (user)        => set({ user, isAuthed: !!user, isLoading: false }),
      setPartner: (partner)  => set({ partner }),
      setLoading: (v)        => set({ isLoading: v }),
      logout: ()             => set({ user: null, partner: null, isAuthed: false, isLoading: false }),
    }),
    {
      name: 'zyntra-auth-v2',
      partialize: (s) => ({ user: s.user, isAuthed: s.isAuthed }),
    }
  )
);

// ── Timer Store (timestamp-based — drift-free) ────────────────────────────────
export const useTimerStore = create(
  persist(
    (set, get) => ({
      isRunning:  false,
      subject:    null,
      studyType:  null,
      chapter:    null,
      startTime:  null,   // ISO string of when timer started
      startEpoch: null,   // ms epoch — used to compute elapsed accurately
      elapsed:    0,      // seconds (computed on each tick, not accumulated)
      _tickId:    null,   // setInterval id (not persisted)

      start: (subject, studyType = 'self', chapter = null) => {
        const now       = new Date();
        const startTime = now.toISOString();
        const startEpoch = now.getTime();

        const tickId = setInterval(() => {
          const elapsed = Math.floor((Date.now() - get().startEpoch) / 1000);
          set({ elapsed });
        }, 1000);

        set({ isRunning: true, subject, studyType, chapter, startTime, startEpoch, elapsed: 0, _tickId: tickId });
      },

      stop: () => {
        const { _tickId, subject, studyType, chapter, startTime, startEpoch } = get();
        if (_tickId) clearInterval(_tickId);

        const endTime         = new Date().toISOString();
        const durationSeconds = Math.floor((Date.now() - startEpoch) / 1000);
        const durationMinutes = Math.round(durationSeconds / 60);

        set({ isRunning: false, subject: null, studyType: null, chapter: null,
              startTime: null, startEpoch: null, elapsed: 0, _tickId: null });
        return { subject, studyType, chapter, startTime, endTime, durationMinutes };
      },

      reset: () => {
        const { _tickId } = get();
        if (_tickId) clearInterval(_tickId);
        set({ isRunning: false, subject: null, studyType: null, chapter: null,
              startTime: null, startEpoch: null, elapsed: 0, _tickId: null });
      },

      // Called on app mount to resume a running timer if page was refreshed
      rehydrate: () => {
        const { isRunning, startEpoch, _tickId } = get();
        if (!isRunning || !startEpoch || _tickId) return; // already ticking or not running

        const elapsed = Math.floor((Date.now() - startEpoch) / 1000);
        const tickId  = setInterval(() => {
          set({ elapsed: Math.floor((Date.now() - get().startEpoch) / 1000) });
        }, 1000);
        set({ elapsed, _tickId: tickId });
      },
    }),
    {
      name: 'zyntra-timer-v3',
      // Don't persist the interval id — it's always recreated
      partialize: (s) => ({
        isRunning: s.isRunning, subject: s.subject, studyType: s.studyType,
        chapter: s.chapter, startTime: s.startTime, startEpoch: s.startEpoch, elapsed: s.elapsed,
      }),
    }
  )
);


// ── UI Store (toasts, modals) ──────────────────────────────────────────────────
export const useUIStore = create((set, get) => ({
  toasts: [],
  modals: {},

  toast: (message, type = 'info', duration = 4000) => {
    const id = Date.now();
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), duration);
  },

  openModal:  (name) => set((s) => ({ modals: { ...s.modals, [name]: true  } })),
  closeModal: (name) => set((s) => ({ modals: { ...s.modals, [name]: false } })),
  isOpen:     (name) => get().modals[name] || false,
}));

// ── Vocabulary UI Store ────────────────────────────────────────────────────────
export const useStore = create(
  persist(
    (set, get) => ({
      // Active module tab
      activeVocabModule:   'forge',
      setActiveVocabModule: (m) => set({ activeVocabModule: m }),

      // Quick Recall Strip
      recallWords:      [],
      recallIndex:      0,
      recallResults:    {},
      setRecallWords:   (words) => set({ recallWords: words, recallIndex: 0, recallResults: {} }),
      nextRecallCard:   ()      => set((s) => ({ recallIndex: Math.min(s.recallIndex + 1, s.recallWords.length - 1) })),
      prevRecallCard:   ()      => set((s) => ({ recallIndex: Math.max(s.recallIndex - 1, 0) })),
      markRecallResult: (wId, result) => set((s) => ({ recallResults: { ...s.recallResults, [wId]: result } })),
      shuffleRecallWords: ()    => set((s) => ({ recallWords: [...s.recallWords].sort(() => Math.random() - 0.5), recallIndex: 0 })),

      // Flashcard Session
      flashMode:           'en_to_bn',
      flashCardIdx:        0,
      flashSessionWords:   [],
      flashSessionResults: [],
      setFlashMode:        (mode)  => set({ flashMode: mode }),
      setFlashSessionWords:(words) => set({ flashSessionWords: words, flashCardIdx: 0, flashSessionResults: [] }),
      nextFlashCard:       ()      => set((s) => ({ flashCardIdx: s.flashCardIdx + 1 })),
      addFlashResult:      (r)     => set((s) => ({ flashSessionResults: [...s.flashSessionResults, r] })),

      // Forge pre-fill (from AI)
      forgePrefill:    null,
      setForgePrefill: (d) => set({ forgePrefill: d, activeVocabModule: 'forge' }),
      clearForgePrefill: () => set({ forgePrefill: null }),

      // Lexi AI Assistant
      lexiOpen:    false,
      lexiResult:  null,
      lexiLoading: false,
      toggleLexi:     ()  => set((s) => ({ lexiOpen: !s.lexiOpen })),
      setLexiResult:  (r) => set({ lexiResult: r }),
      setLexiLoading: (v) => set({ lexiLoading: v }),
    }),
    { name: 'zyntra-store-v2' }
  )
);