import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { 
  ShieldCheck, 
  Mail, 
  Lock, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Database, 
  Zap, 
  Github,
  Globe
} from 'lucide-react';

const SUGGESTED_HANDLES = ['torvalds', 'gaearon', 'yyx990803'];

export const AuthScreen: React.FC = () => {
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'gmail'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [githubUsername, setGithubUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<string>('Checking Atlas Connection...');
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const { setAuth, setVerifiedSkills } = useAppStore();

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => setDbStatus(`Connected: ${d.database}`))
      .catch(() => setDbStatus('Offline (will connect automatically)'));
  }, []);

  // Listen for Google OAuth popup callback messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }

      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const { token, user, verifiedSkills } = event.data;
        if (token && user) {
          setAuth(token, user);
          if (verifiedSkills && verifiedSkills.length > 0) {
            setVerifiedSkills(verifiedSkills);
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [setAuth, setVerifiedSkills]);

  const handleStandardAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSyncStatus(null);
    setLoading(true);

    const endpoint = authMode === 'login' ? '/auth/login' : '/auth/signup';

    try {
      if (githubUsername.trim()) {
        setSyncStatus(`Authenticating and analyzing GitHub @${githubUsername.trim()}...`);
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          githubUsername: githubUsername.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      setAuth(data.token, data.user);
      if (data.verifiedSkills && data.verifiedSkills.length > 0) {
        setVerifiedSkills(data.verifiedSkills);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error');
    } finally {
      setLoading(false);
      setSyncStatus(null);
    }
  };

  const handleGmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSyncStatus(null);
    setLoading(true);

    try {
      const gmailAddress = email.includes('@') ? email : `${email}@gmail.com`;
      if (githubUsername.trim()) {
        setSyncStatus(`Authenticating Gmail & analyzing GitHub @${githubUsername.trim()}...`);
      }

      const res = await fetch('/auth/gmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: gmailAddress,
          name: gmailAddress.split('@')[0],
          githubUsername: githubUsername.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gmail authentication failed');
      }

      setAuth(data.token, data.user);
      if (data.verifiedSkills && data.verifiedSkills.length > 0) {
        setVerifiedSkills(data.verifiedSkills);
      }
    } catch (err: any) {
      setError(err.message || 'Gmail login error');
    } finally {
      setLoading(false);
      setSyncStatus(null);
    }
  };

  const handleGoogleOAuthPopup = async () => {
    setError(null);
    try {
      const res = await fetch('/api/auth/google/url');
      const data = await res.json();

      if (data.url) {
        const authWindow = window.open(
          data.url,
          'google_oauth_popup',
          'width=580,height=680,menubar=no,toolbar=no'
        );

        if (!authWindow) {
          setError('Please allow popups to continue with Google Authentication.');
        }
      }
    } catch (err: any) {
      setError('Could not initialize Google OAuth popup.');
    }
  };

  const handleQuickDemo = async () => {
    setEmail('learner.demo@skillforge.ai');
    setPassword('skillforge123');
    setGithubUsername('torvalds');
    setError(null);
    setLoading(true);
    setSyncStatus('Logging in and auto-fetching Linus Torvalds GitHub repository skills...');

    try {
      let res = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'learner.demo@skillforge.ai',
          password: 'skillforge123',
          githubUsername: 'torvalds',
        }),
      });

      if (!res.ok) {
        res = await fetch('/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'learner.demo@skillforge.ai',
            password: 'skillforge123',
            githubUsername: 'torvalds',
          }),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Demo login failed');

      setAuth(data.token, data.user);
      if (data.verifiedSkills && data.verifiedSkills.length > 0) {
        setVerifiedSkills(data.verifiedSkills);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setSyncStatus(null);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-indigo-950/40 relative overflow-hidden backdrop-blur-xl">
        {/* Subtle decorative glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 shadow-lg shadow-indigo-600/30 mb-3">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">SkillForge AI</h1>
          <p className="text-xs text-slate-400 mt-1">
            AI-Native Skill Verification & Multilingual Tutoring
          </p>

          {/* Database indicator */}
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300 font-mono">
            <Database className="w-3 h-3 text-emerald-400" />
            <span>{dbStatus}</span>
          </div>
        </div>

        {/* Google / Gmail Quick Authentication Button */}
        <div className="mb-5 space-y-2">
          <button
            type="button"
            onClick={() => {
              setAuthMode('gmail');
              setEmail(email.includes('@') ? email : (email ? `${email}@gmail.com` : 'learner.potlapalli@gmail.com'));
            }}
            className="w-full py-2.5 px-4 bg-slate-950 hover:bg-slate-850 border border-slate-700/80 hover:border-indigo-500/50 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-3 transition-all cursor-pointer shadow-sm group"
          >
            {/* Google "G" Icon */}
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Authenticate via Gmail / Google</span>
          </button>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-3 text-[10px] uppercase font-mono text-slate-500 tracking-wider">
              Or with email
            </span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 p-1 bg-slate-950 rounded-xl border border-slate-800/80 mb-5">
          <button
            type="button"
            onClick={() => { setAuthMode('login'); setError(null); }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              authMode === 'login' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode('signup'); setError(null); }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              authMode === 'signup' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Create
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode('gmail'); setError(null); }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              authMode === 'gmail' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Gmail Auth
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Sync status during live GitHub analysis */}
        {syncStatus && (
          <div className="mb-4 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs flex items-center gap-2">
            <span className="inline-block w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin shrink-0" />
            <span>{syncStatus}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={authMode === 'gmail' ? handleGmailAuth : handleStandardAuth} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              {authMode === 'gmail' ? 'Gmail Address' : 'Email Address'}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={authMode === 'gmail' ? 'yourname@gmail.com' : 'learner@example.com'}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>
          </div>

          {authMode !== 'gmail' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>
            </div>
          )}

          {/* GitHub Auto-Fetch Field */}
          <div className="pt-1">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Github className="w-3.5 h-3.5 text-indigo-400" />
                <span>GitHub Username (Auto-syncs skills)</span>
              </label>
              <span className="text-[10px] text-emerald-400 font-mono">Optional</span>
            </div>
            <div className="relative">
              <span className="text-slate-500 text-sm absolute left-3 top-1/2 -translate-y-1/2 font-mono">@</span>
              <input
                type="text"
                value={githubUsername}
                onChange={(e) => setGithubUsername(e.target.value)}
                placeholder="e.g. torvalds, gaearon, or your handle"
                className="w-full pl-8 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              SkillForge will automatically fetch public repos, languages, and calculate verified skills into Atlas during login.
            </p>

            {/* Quick pre-fill pills */}
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-[10px] text-slate-500">Test handles:</span>
              {SUGGESTED_HANDLES.map((handle) => (
                <button
                  key={handle}
                  type="button"
                  onClick={() => setGithubUsername(handle)}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-indigo-300 hover:border-indigo-500/40 transition-colors cursor-pointer"
                >
                  @{handle}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 mt-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>
                  {authMode === 'login'
                    ? 'Sign In & Sync Profile'
                    : authMode === 'signup'
                    ? 'Create Account & Extract Skills'
                    : 'Authenticate Gmail Account'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Access */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
          <button
            type="button"
            onClick={handleQuickDemo}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Instant One-Click Demo (Auto-loads @torvalds Skills)</span>
          </button>
          <p className="text-[11px] text-slate-500 mt-2">
            Auto-seeds authenticated session & GitHub repository skills into MongoDB.
          </p>
        </div>
      </div>
    </div>
  );
};

