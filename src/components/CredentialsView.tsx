import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { apiRequest } from '../api';
import { 
  Award, 
  FileText, 
  Sparkles, 
  ShieldCheck, 
  Copy, 
  Check, 
  Download, 
  AlertCircle, 
  ExternalLink,
  Layers,
  Flame,
  Star
} from 'lucide-react';

export const CredentialsView: React.FC = () => {
  const { user, verifiedSkills, badges, setBadges, savedDocs, setSavedDocs } = useAppStore();
  const [loadingType, setLoadingType] = useState<'resume' | 'lor' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeDoc, setActiveDoc] = useState<{ type: 'resume' | 'lor'; content: string; skills: string[] } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchDocsAndBadges = async () => {
      try {
        const [badgeRes, docRes] = await Promise.all([
          apiRequest('/api/badge/badges'),
          apiRequest('/api/generate/docs'),
        ]);
        if (badgeRes.badges) setBadges(badgeRes.badges);
        if (docRes.docs) setSavedDocs(docRes.docs);

        // Pre-display most recent doc if exists
        if (docRes.docs?.[0]) {
          setActiveDoc({
            type: docRes.docs[0].docType,
            content: docRes.docs[0].content,
            skills: docRes.docs[0].verifiedSkillsIncluded || [],
          });
        }
      } catch (e) {
        console.warn('Fetch docs/badges error:', e);
      }
    };
    fetchDocsAndBadges();
  }, [setBadges, setSavedDocs]);

  const handleGenerateDoc = async (type: 'resume' | 'lor') => {
    setError(null);
    setLoadingType(type);

    try {
      const endpoint = type === 'resume' ? '/api/generate/resume' : '/api/generate/lor';
      const res = await apiRequest(endpoint, { method: 'POST' });

      if (res.doc) {
        setActiveDoc({
          type: res.doc.docType,
          content: res.doc.content,
          skills: res.doc.verifiedSkillsIncluded || [],
        });

        // Refresh docs
        const docRes = await apiRequest('/api/generate/docs');
        if (docRes.docs) setSavedDocs(docRes.docs);
      }
    } catch (err: any) {
      setError(err.message || `Failed to generate verified ${type}.`);
    } finally {
      setLoadingType(null);
    }
  };

  const handleCopy = () => {
    if (!activeDoc) return;
    navigator.clipboard.writeText(activeDoc.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!activeDoc) return;
    const blob = new Blob([activeDoc.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SkillForge_${activeDoc.type.toUpperCase()}_${user?.email?.split('@')[0] || 'Learner'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold mb-3">
              <Award className="w-3.5 h-3.5" />
              <span>Grounded Document Synthesis & Verified Mastery Badges</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Verified Career Credentials & Letters
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Every sentence in your generated Resume and Letter of Recommendation (LOR) is cryptographically grounded in your authenticated MongoDB VerifiedSkill, Assessment, and Certification ledger.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleGenerateDoc('resume')}
              disabled={loadingType !== null}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {loadingType === 'resume' ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              <span>Synthesize Verified Resume</span>
            </button>

            <button
              onClick={() => handleGenerateDoc('lor')}
              disabled={loadingType !== null}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {loadingType === 'lor' ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 text-amber-400" />
              )}
              <span>Synthesize Grounded LOR</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Mastery Badges Section */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              <span>Verified Mastery Distinctions & Badges</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Awarded for high-percentile proctored scores and multi-modal engineering excellence.
            </p>
          </div>

          <span className="text-xs px-3 py-1 bg-slate-950 border border-slate-800 rounded-full font-semibold text-amber-300">
            {badges.length} Badges Earned
          </span>
        </div>

        {badges.length === 0 ? (
          <div className="p-6 bg-slate-950/60 rounded-2xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
            Complete a proctored assessment with ≥85% score to earn your first distinction badge!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {badges.map((badge) => (
              <div
                key={badge._id}
                className="bg-slate-950 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-5 space-y-2.5 transition-colors relative overflow-hidden"
              >
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Award className="w-5 h-5" />
                  </div>
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                    badge.rarity === 'platinum'
                      ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                      : badge.rarity === 'gold'
                      ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}>
                    {badge.rarity}
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-white text-sm">{badge.title}</h4>
                  <p className="text-xs text-slate-400 mt-1">{badge.description}</p>
                </div>

                <div className="pt-2 border-t border-slate-850 text-[10px] text-slate-500 font-mono">
                  {badge.criteria}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Generated Document Viewer */}
      {activeDoc && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                Grounded {activeDoc.type.toUpperCase()}
              </span>
              <h3 className="text-lg font-bold text-white mt-1">
                {activeDoc.type === 'resume' ? 'Verified Technical Resume' : 'Academic & Industry Recommendation Letter'}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied Markdown' : 'Copy Markdown'}</span>
              </button>

              <button
                onClick={handleDownload}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .MD</span>
              </button>
            </div>
          </div>

          {/* Included Verified Skills Badge Pills */}
          {activeDoc.skills && activeDoc.skills.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 py-1">
              <span className="text-[11px] text-slate-500 font-semibold mr-1">Grounded in:</span>
              {activeDoc.skills.map((s, idx) => (
                <span
                  key={idx}
                  className="text-[11px] px-2.5 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-emerald-300 font-mono flex items-center gap-1"
                >
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  {s}
                </span>
              ))}
            </div>
          )}

          {/* Document Content Box */}
          <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800 font-mono text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap overflow-x-auto shadow-inner">
            {activeDoc.content}
          </div>
        </div>
      )}
    </div>
  );
};
