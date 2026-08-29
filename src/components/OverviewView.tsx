import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { apiRequest } from '../api';
import { 
  ShieldCheck, 
  Github, 
  BookOpen, 
  MessageSquare, 
  Camera, 
  FileCheck2, 
  Award, 
  BarChart3, 
  ArrowUpRight, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  Database,
  Layers,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

export const OverviewView: React.FC = () => {
  const { user, setActiveTab, verifiedSkills, setVerifiedSkills, metrics, setMetrics, badges, setBadges } = useAppStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [skillsRes, metricsRes, badgesRes] = await Promise.all([
          apiRequest('/api/profile/verified-skills'),
          apiRequest('/api/metrics/summary'),
          apiRequest('/api/badge/badges'),
        ]);
        if (skillsRes.verifiedSkills) setVerifiedSkills(skillsRes.verifiedSkills);
        if (metricsRes) setMetrics(metricsRes);
        if (badgesRes.badges) setBadges(badgesRes.badges);
      } catch (err) {
        console.warn('Overview fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [setVerifiedSkills, setMetrics, setBadges]);

  const avgConfidence = verifiedSkills.length > 0
    ? Math.round((verifiedSkills.reduce((acc, s) => acc + s.confidenceScore, 0) / verifiedSkills.length) * 100)
    : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner / Welcome */}
      <div className="bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-900 border border-indigo-900/40 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI-Native Verification & Cognitive Tutoring Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, <span className="text-indigo-400">{user?.email?.split('@')[0]}</span>
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Your profile is synchronized with MongoDB Atlas. Verify your engineering capabilities through live GitHub public feature extraction, proctored dual-pass assessments, and accredited certificate OCR.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setActiveTab('github-verify')}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Github className="w-4 h-4" />
              <span>Verify GitHub Skills</span>
            </button>
            <button
              onClick={() => setActiveTab('tutoring')}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-2 transition-all cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              <span>Open AI Tutor</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Verified Skills</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mt-2">{verifiedSkills.length}</p>
          <p className="text-[11px] text-slate-400 mt-1">Multi-modal verified items</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Avg Skill Confidence</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mt-2">{avgConfidence}%</p>
          <p className="text-[11px] text-emerald-400 mt-1">Weighted metric accuracy</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Proctoring Integrity</span>
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <Camera className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mt-2">
            {metrics?.summary.proctorComplianceRate ?? 100}%
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Zero-cheat verification</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Mastery Badges</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mt-2">{badges.length}</p>
          <p className="text-[11px] text-amber-400 mt-1">Issued distinctions</p>
        </div>
      </div>

      {/* Core Platform Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Module 1: GitHub Skill Extraction */}
        <div 
          onClick={() => setActiveTab('github-verify')}
          className="group bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-6 transition-all cursor-pointer shadow-sm relative overflow-hidden"
        >
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 group-hover:bg-indigo-600 group-hover:text-white transition-colors mb-4">
            <Github className="w-5 h-5" />
          </div>
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-white text-base group-hover:text-indigo-300 transition-colors">GitHub Verification</h3>
            <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
          </div>
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            Extract public repo volumes, commit cadence, language share, and transparent weighted scoring (w1..w5).
          </p>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400">
            <span>Analyze Public Repos</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Module 2: Adaptive Learning Plan */}
        <div 
          onClick={() => setActiveTab('plan')}
          className="group bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-6 transition-all cursor-pointer shadow-sm relative overflow-hidden"
        >
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 group-hover:bg-indigo-600 group-hover:text-white transition-colors mb-4">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-white text-base group-hover:text-indigo-300 transition-colors">Goal Curriculum</h3>
            <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
          </div>
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            Gemini synthesizes a personalized multi-module learning plan bridging your verified skills to your target career role.
          </p>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400">
            <span>View Learning Path</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Module 3: RAG Multilingual AI Tutor */}
        <div 
          onClick={() => setActiveTab('tutoring')}
          className="group bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-6 transition-all cursor-pointer shadow-sm relative overflow-hidden"
        >
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 group-hover:bg-indigo-600 group-hover:text-white transition-colors mb-4">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-white text-base group-hover:text-indigo-300 transition-colors">RAG AI Tutor</h3>
            <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
          </div>
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            Streaming multilingual guidance grounded in top-5 vector learner memories with automatic cognitive turn summarization.
          </p>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400">
            <span>Launch Live Chat</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Module 4: AI Proctored Assessment */}
        <div 
          onClick={() => setActiveTab('assessment')}
          className="group bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-6 transition-all cursor-pointer shadow-sm relative overflow-hidden"
        >
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 group-hover:bg-indigo-600 group-hover:text-white transition-colors mb-4">
            <Camera className="w-5 h-5" />
          </div>
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-white text-base group-hover:text-indigo-300 transition-colors">Proctored Assessment</h3>
            <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
          </div>
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            Webcam presence & face identity verification with code-graded objectives and dual-pass independent AI reviews.
          </p>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400">
            <span>Start Test Session</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Module 5: Certificate OCR Parser */}
        <div 
          onClick={() => setActiveTab('certificates')}
          className="group bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-6 transition-all cursor-pointer shadow-sm relative overflow-hidden"
        >
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 group-hover:bg-indigo-600 group-hover:text-white transition-colors mb-4">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-white text-base group-hover:text-indigo-300 transition-colors">Certificate OCR</h3>
            <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
          </div>
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            Upload course certificates, degrees, or licenses with multi-point character recognition and honest OCR confidence metrics.
          </p>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400">
            <span>Upload Certificate</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Module 6: Grounded Resume & LOR */}
        <div 
          onClick={() => setActiveTab('credentials')}
          className="group bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-6 transition-all cursor-pointer shadow-sm relative overflow-hidden"
        >
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 group-hover:bg-indigo-600 group-hover:text-white transition-colors mb-4">
            <Award className="w-5 h-5" />
          </div>
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-white text-base group-hover:text-indigo-300 transition-colors">Resume & LOR</h3>
            <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
          </div>
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            Synthesize verified technical resumes and Letters of Recommendation strictly grounded on authenticated DB records.
          </p>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400">
            <span>Generate Documents</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* Verified Skills Ledger */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              <span>Verified Skill Ledger (MongoDB Atlas)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Cryptographically backed and multi-modal verified competencies with evidence metrics.
            </p>
          </div>

          <button
            onClick={() => setActiveTab('metrics')}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer"
          >
            <span>View Full Analytics Radar</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {verifiedSkills.length === 0 ? (
          <div className="text-center py-10 bg-slate-950/60 rounded-2xl border border-dashed border-slate-800 p-6">
            <ShieldCheck className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-300">No verified skills recorded yet</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Attach your public GitHub username, upload an accredited certificate, or complete a proctored assessment to populate your ledger.
            </p>
            <button
              onClick={() => setActiveTab('github-verify')}
              className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Verify First Skill via GitHub
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {verifiedSkills.map((skill) => {
              const scorePct = Math.round(skill.confidenceScore * 100);
              return (
                <div
                  key={skill._id}
                  className="bg-slate-950 border border-slate-800/90 rounded-2xl p-4.5 hover:border-slate-700 transition-colors relative"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h4 className="font-bold text-white text-sm">{skill.skillName}</h4>
                      <span className="text-[11px] text-slate-400">{skill.category}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${
                      skill.source === 'github'
                        ? 'bg-slate-800 text-slate-300 border-slate-700'
                        : skill.source === 'assessment'
                        ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                        : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                    }`}>
                      {skill.source}
                    </span>
                  </div>

                  {/* Confidence Bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-slate-400">Confidence Score</span>
                      <span className="font-bold text-emerald-400">{scorePct}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-500"
                        style={{ width: `${scorePct}%` }}
                      />
                    </div>
                  </div>

                  {/* Evidence snippet */}
                  {skill.evidenceDetails?.justification && (
                    <p className="text-[11px] text-slate-500 mt-2 line-clamp-2 italic">
                      "{skill.evidenceDetails.justification}"
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
