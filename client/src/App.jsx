import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store';
import { onAuthChange } from './firebase/auth';
import { findUserByEmail, createOrUpdateUser } from './firebase/db';
import { getPartnerEmail, getDisplayName } from './lib/constants';
import { onForegroundMessage } from './firebase/messaging';


import AppLayout       from './components/layout/AppLayout';
import LoginPage       from './pages/LoginPage';
import DashboardPage   from './features/dashboard/DashboardPage';
import CheckinPage     from './pages/CheckinPage';
import TimerPage       from './pages/TimerPage';
import StatsPage       from './pages/StatsPage';
import ChaptersPage    from './pages/ChaptersPage';
import AIReportPage    from './pages/AIReportPage';
import RevisionPage    from './pages/RevisionPage';
import NotesPage       from './pages/NotesPage';
import MistakePage     from './pages/MistakePage';
import RoutinePage     from './pages/RoutinePage';
import VocabularyPage  from './pages/VocabularyPage';
import ChatPage        from './features/chat/ChatPage';
import LeaderboardPage from './features/leaderboard/LeaderboardPage';
import Toast           from './components/ui/Toast';

// ── Auth guard ────────────────────────────────────────────────────────────────
function PrivateRoute({ children }) {
  const { isAuthed, isLoading } = useAuthStore();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080b14] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
          <p className="text-slate-400 text-sm">Loading Zyntra StudyVerse…</p>
        </div>
      </div>
    );
  }
  return isAuthed ? children : <Navigate to="/login" replace />;
}

// ── Firebase auth listener ────────────────────────────────────────────────────
function AuthInitializer() {
  const { setUser, setPartner, setLoading } = useAuthStore();

  useEffect(() => {
    const unsub = onAuthChange(async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        return;
      }
      try {
        // Ensure user doc exists in Firestore
        const displayName = getDisplayName(firebaseUser.email);
        await createOrUpdateUser(firebaseUser.uid, {
          email:       firebaseUser.email,
          displayName: displayName,
          uid:         firebaseUser.uid,
        });

        // Load partner
        const partnerEmail = getPartnerEmail(firebaseUser.email);
        if (partnerEmail) {
          const partner = await findUserByEmail(partnerEmail);
          setPartner(partner);
        }

        setUser({
          uid:         firebaseUser.uid,
          email:       firebaseUser.email,
          displayName: displayName,
        });
      } catch (err) {
        console.error('[Auth] init error:', err);
        setUser({ uid: firebaseUser.uid, email: firebaseUser.email, displayName: getDisplayName(firebaseUser.email) });
      }
    });
    return unsub;
  }, []);

  return null;
}

// ── FCM Foreground Message Handler ───────────────────────────────────────────
function FCMForegroundListener() {
  const user = useAuthStore(s => s.user);

  useEffect(() => {
    // Listen for FCM messages when app is in foreground
    const unsubFCM = onForegroundMessage((payload) => {
      const { title, body } = payload.notification || {};
      const data = payload.data || {};
      // Show via browser Notification API if permission granted
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(title || 'ZYNTRA StudyVerse', {
            body:  body || '',
            icon:  '/android-chrome-192x192.png',
            badge: '/favicon-32x32.png',
            tag:   data.type || 'zyntra',
          });
        } catch (_) {}
      }
    });
    return unsubFCM;
  }, [user?.uid]); // eslint-disable-line

  return null;
}

// ── Root App ──────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AuthInitializer />
      <FCMForegroundListener />
      <Toast />
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/"
          element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          }
        >
          <Route index                  element={<DashboardPage />}   />
          <Route path="checkin"         element={<CheckinPage />}     />
          <Route path="timer"           element={<TimerPage />}       />
          <Route path="stats"           element={<StatsPage />}       />
          <Route path="chapters"        element={<ChaptersPage />}    />
          <Route path="ai"              element={<AIReportPage />}    />
          <Route path="revision"        element={<RevisionPage />}    />
          <Route path="notes"           element={<NotesPage />}       />
          <Route path="mistakes"        element={<MistakePage />}     />
          <Route path="routine"         element={<RoutinePage />}     />
          <Route path="vocabulary"      element={<VocabularyPage />}  />
          <Route path="chat"            element={<ChatPage />}        />
          <Route path="leaderboard"     element={<LeaderboardPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}