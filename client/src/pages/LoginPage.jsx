import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { loginWithEmail } from '../firebase/auth';
import { useAuthStore } from '../store';
import { COUPLE_CONFIG } from '../lib/constants';

export default function LoginPage() {
  const navigate = useNavigate();
  const { isAuthed } = useAuthStore();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    if (isAuthed) {
      navigate('/', { replace: true });
    }
  }, [isAuthed, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const validEmails = [COUPLE_CONFIG.saifulEmail, COUPLE_CONFIG.lizaEmail];
    if (!validEmails.includes(email.trim().toLowerCase())) {
      setError('This app is private. Unauthorized email.');
      return;
    }
    setLoading(true);
    try {
      await loginWithEmail(email.trim(), password);
      // Auth listener in App.jsx will set the store
    } catch (err) {
      const msg = err.code === 'auth/invalid-credential' ? 'Wrong email or password.'
                : err.code === 'auth/too-many-requests'  ? 'Too many attempts. Try again later.'
                : 'Login failed. Check your credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080b14] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.96 }}
        animate={{ opacity: 1, y: 0,  scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 to-purple-600 shadow-[0_0_40px_rgba(6,182,212,0.3)] mb-5"
          >
            <span className="text-4xl">⚡</span>
          </motion.div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-blue-300 to-purple-400 bg-clip-text text-transparent">
            ZYNTRA
          </h1>
          <p className="text-slate-400 text-sm mt-1 tracking-widest uppercase">StudyVerse</p>
          <p className="text-slate-500 text-xs mt-3">Private couple study ecosystem</p>
        </div>

        {/* Card */}
        <div className="relative rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-8 shadow-2xl">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500/5 to-purple-500/5 pointer-events-none" />

          <form onSubmit={handleSubmit} className="relative space-y-5">
            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2 tracking-wide uppercase">
                Email
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-base">✉️</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  autoComplete="email"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3
                             text-white placeholder-slate-600 text-sm
                             focus:outline-none focus:border-cyan-500/50 focus:bg-white/[0.07]
                             transition-all duration-200"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2 tracking-wide uppercase">
                Password
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-base">🔒</span>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-12 py-3
                             text-white placeholder-slate-600 text-sm
                             focus:outline-none focus:border-cyan-500/50 focus:bg-white/[0.07]
                             transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5"
              >
                {error}
              </motion.div>
            )}

            {/* Submit */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-semibold text-sm
                         bg-gradient-to-r from-cyan-500 to-purple-600
                         hover:from-cyan-400 hover:to-purple-500
                         disabled:opacity-50 disabled:cursor-not-allowed
                         shadow-[0_0_20px_rgba(6,182,212,0.25)]
                         transition-all duration-200 text-white"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : 'Enter StudyVerse →'}
            </motion.button>
          </form>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          🔐 Private access only — Saiful & Liza
        </p>
      </motion.div>
    </div>
  );
}
