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

// ── Timer Store ────────────────────────────────────────────────────────────────
export const useTimerStore = create((set, get) => ({
  isRunning:  false,
  subject:    null,
  studyType:  null,
  chapter:    null,
  startTime:  null,
  elapsed:    0,
  intervalId: null,

  start: (subject, studyType = 'self', chapter = null) => {
    const startTime  = new Date().toISOString();
    const intervalId = setInterval(() => set((s) => ({ elapsed: s.elapsed + 1 })), 1000);
    set({ isRunning: true, subject, studyType, chapter, startTime, elapsed: 0, intervalId });
  },

  stop: () => {
    const { intervalId, subject, studyType, chapter, startTime, elapsed } = get();
    if (intervalId) clearInterval(intervalId);
    const endTime         = new Date().toISOString();
    const durationMinutes = Math.round(elapsed / 60);
    set({ isRunning: false, subject: null, studyType: null, chapter: null, startTime: null, elapsed: 0, intervalId: null });
    return { subject, studyType, chapter, startTime, endTime, durationMinutes };
  },

  reset: () => {
    const { intervalId } = get();
    if (intervalId) clearInterval(intervalId);
    set({ isRunning: false, subject: null, studyType: null, chapter: null, startTime: null, elapsed: 0, intervalId: null });
  },
}));

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