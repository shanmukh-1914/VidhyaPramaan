import React, { useEffect, useState } from 'react';
import { useAppStore, ActiveTab } from '../store/useAppStore';
import { 
  ShieldCheck, 
  Github, 
  BookOpen, 
  MessageSquare, 
  Camera, 
  FileCheck2, 
  Award, 
  BarChart3, 
  LogOut, 
  Database, 
  Cpu, 
  Globe,
  Sparkles,
  User as UserIcon
} from 'lucide-react';

const SUPPORTED_LANGUAGES = [
  { code: 'English', label: 'English (EN)' },
  { code: 'Spanish', label: 'Español (ES)' },
  { code: 'Hindi', label: 'हिन्दी (HI)' },
  { code: 'Telugu', label: 'తెలుగు (TE)' },
  { code: 'French', label: 'Français (FR)' },
  { code: 'German', label: 'Deutsch (DE)' },
  { code: 'Japanese', label: '日本語 (JA)' },
  { code: 'Mandarin', label: '中文 (ZH)' },
  { code: 'Portuguese', label: 'Português (PT)' },
];

export const Navbar: React.FC = () => {
  const { user, activeTab, setActiveTab, language, setLanguage, logout, verifiedSkills } = useAppStore();
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking');

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'healthy') setDbStatus('connected');
        else setDbStatus('error');
      })
      .catch(() => setDbStatus('error'));
  }, []);

  const navItems: Array<{ id: ActiveTab; label: string; icon: React.ReactNode }> = [
    { id: 'overview', label: 'Dashboard', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'github-verify', label: 'GitHub Verify', icon: <Github className="w-4 h-4" /> },
    { id: 'plan', label: 'Learning Plan', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'tutoring', label: 'AI Tutor', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'assessment', label: 'Proctored Test', icon: <Camera className="w-4 h-4" /> },
    { id: 'certificates', label: 'OCR Credential', icon: <FileCheck2 className="w-4 h-4" /> },
    { id: 'credentials', label: 'Resume & Badges', icon: <Award className="w-4 h-4" /> },
    { id: 'metrics', label: 'Metrics', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'admin', label: 'Operations & Hub', icon: <Cpu className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('overview')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white">SkillForge</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  AI-Native
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Skill Verification & Multilingual Tutoring</p>
            </div>
          </div>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800/80">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right Status, Language, Profile */}
          <div className="flex items-center gap-3">
            {/* Live DB / Vector status indicator */}
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-xs">
              <span className={`w-2 h-2 rounded-full ${dbStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="text-slate-300 font-mono text-[11px]">
                {dbStatus === 'connected' ? 'MongoDB Atlas' : 'Connecting DB'}
              </span>
            </div>

            {/* Language Selector */}
            <div className="relative flex items-center bg-slate-950 border border-slate-800 rounded-lg px-2 py-1">
              <Globe className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-transparent text-xs text-slate-200 font-medium focus:outline-none cursor-pointer"
              >
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code} className="bg-slate-900 text-slate-100">
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            {/* User Profile & Logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 text-xs font-bold">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="hidden xl:block text-left">
                <p className="text-xs font-semibold text-slate-200 truncate max-w-[120px]">{user?.email}</p>
                <p className="text-[10px] text-emerald-400 font-medium">
                  {verifiedSkills.length} Verified Skills
                </p>
              </div>
              <button
                onClick={logout}
                title="Sign Out"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Scroll */}
        <div className="flex md:hidden overflow-x-auto py-2 gap-1 border-t border-slate-800/50 no-scrollbar">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                activeTab === item.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
