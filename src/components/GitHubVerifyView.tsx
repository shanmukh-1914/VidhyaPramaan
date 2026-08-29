import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { apiRequest } from '../api';
import { 
  Github, 
  Search, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Code2, 
  GitFork, 
  Star, 
  Calendar, 
  Layers, 
  Info, 
  Sparkles, 
  ExternalLink 
} from 'lucide-react';

const SUGGESTED_USERNAMES = [
  { username: 'torvalds', name: 'Linus Torvalds', label: 'C / Linux' },
  { username: 'gaearon', name: 'Dan Abramov', label: 'JavaScript / React' },
  { username: 'yyx990803', name: 'Evan You', label: 'TypeScript / Vue' },
];

export const GitHubVerifyView: React.FC = () => {
  const { user, verifiedSkills, setVerifiedSkills } = useAppStore();
  const [username, setUsername] = useState(user?.githubUsername || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<any | null>(null);
  const [showFormulaModal, setShowFormulaModal] = useState(false);

  const handleVerify = async (targetUsername?: string) => {
    const handle = (targetUsername || username).trim();
    if (!handle) {
      setError('Please enter a valid public GitHub username.');
      return;
    }

    setUsername(handle);
    setError(null);
    setLoading(true);

    try {
      const res = await apiRequest('/api/profile/verify-github', {
        method: 'POST',
        body: JSON.stringify({ githubUsername: handle }),
      });

      setExtractedData(res.profileData);
      if (res.verifiedSkills) {
        // Refresh verified skills
        const refreshed = await apiRequest('/api/profile/verified-skills');
        if (refreshed.verifiedSkills) setVerifiedSkills(refreshed.verifiedSkills);
      }
    } catch (err: any) {
      setError(err.message || 'GitHub skill extraction failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold mb-3 border border-slate-700">
              <Github className="w-3.5 h-3.5" />
              <span>Unauthenticated Public REST API (60 req/hr rate-managed)</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              GitHub Skill Verification Engine
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Extracts public repository history, commit activity, language share, and documentation quality. Analyzed through a transparent, weighted multi-factor confidence function.
            </p>
          </div>

          <button
            onClick={() => setShowFormulaModal(!showFormulaModal)}
            className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/50 text-indigo-300 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shrink-0"
          >
            <Info className="w-4 h-4 text-indigo-400" />
            <span>View Scoring Formula & Weights</span>
          </button>
        </div>

        {/* Scoring Weights Formula Card (Collapsible) */}
        {showFormulaModal && (
          <div className="mt-6 p-5 bg-slate-950 rounded-2xl border border-indigo-500/30 text-xs space-y-3">
            <h4 className="font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Transparent Hand-Tuned Skill Confidence Function:</span>
            </h4>
            <div className="p-3 bg-slate-900 rounded-xl font-mono text-[11px] text-indigo-300 border border-slate-800">
              score = w1·norm(repo_count) + w2·norm(commits_last_6mo) + w3·language_match + w4·norm(account_age_years) + w5·readme_quality_score
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 text-[11px]">
              <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800">
                <span className="font-bold text-slate-200">w1 = 0.20 (Repo Count)</span>
                <p className="text-slate-400 mt-1">Measures project volume and hands-on development diversity.</p>
              </div>
              <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800">
                <span className="font-bold text-slate-200">w2 = 0.25 (Commit Cadence)</span>
                <p className="text-slate-400 mt-1">Reflects up-to-date syntax familiarity and active coding presence.</p>
              </div>
              <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800">
                <span className="font-bold text-slate-200">w3 = 0.30 (Language Share)</span>
                <p className="text-slate-400 mt-1">Direct repository byte match volume is the strongest competency signal.</p>
              </div>
              <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800">
                <span className="font-bold text-slate-200">w4 = 0.10 (Account Age)</span>
                <p className="text-slate-400 mt-1">Correlates with long-term engineering maturity & problem solving.</p>
              </div>
              <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800">
                <span className="font-bold text-slate-200">w5 = 0.15 (README Quality)</span>
                <p className="text-slate-400 mt-1">Rewards structured documentation and testing awareness.</p>
              </div>
            </div>
          </div>
        )}

        {/* Input Field & Search */}
        <div className="mt-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerify();
            }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <div className="relative flex-1">
              <Github className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter any public GitHub username (e.g. torvalds, gaearon, your username)..."
                className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer shrink-0"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Extract & Verify Skills</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Pre-fill Pill suggestions */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400">Test real public profiles:</span>
            {SUGGESTED_USERNAMES.map((sug) => (
              <button
                key={sug.username}
                onClick={() => handleVerify(sug.username)}
                className="text-xs px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span className="font-semibold text-indigo-400">@{sug.username}</span>
                <span className="text-[10px] text-slate-400">({sug.label})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Error notice */}
        {error && (
          <div className="mt-4 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Extracted Profile & Skill Analysis Results */}
      {extractedData && (
        <div className="space-y-6">
          {/* GitHub Profile Banner */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div className="flex items-center gap-4">
                {extractedData.avatarUrl && (
                  <img
                    src={extractedData.avatarUrl}
                    alt={extractedData.username}
                    className="w-16 h-16 rounded-2xl border-2 border-indigo-500/40 shadow-lg object-cover"
                  />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-white">@{extractedData.username}</h3>
                    <a
                      href={`https://github.com/${extractedData.username}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-slate-400 hover:text-white"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{extractedData.bio}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Public Repos</span>
                  <span className="font-bold text-white text-sm">{extractedData.publicRepos}</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Account Age</span>
                  <span className="font-bold text-white text-sm">{extractedData.accountAgeYears} yrs</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Followers</span>
                  <span className="font-bold text-white text-sm">{extractedData.followers}</span>
                </div>
              </div>
            </div>

            {/* Language Share Breakdown */}
            <div className="mt-6">
              <h4 className="text-xs font-bold text-slate-300 mb-3 flex items-center gap-2">
                <Code2 className="w-4 h-4 text-indigo-400" />
                <span>Primary Language Distribution in Repositories</span>
              </h4>
              <div className="flex flex-wrap gap-2">
                {extractedData.topLanguages.map((lang: any) => (
                  <div
                    key={lang.language}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-950 rounded-xl border border-slate-800 text-xs"
                  >
                    <span className="font-semibold text-white">{lang.language}</span>
                    <span className="text-indigo-400 font-mono font-bold">{lang.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Computed Verified Skills with Transparent Justifications */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8">
            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>Verified Competency Scores (Persisted to MongoDB)</span>
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Each score is dynamically computed from normalized repo activity, language volume, longevity, and documentation quality.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {extractedData.computedSkills.map((skill: any) => {
                const scorePct = Math.round(skill.confidenceScore * 100);
                return (
                  <div
                    key={skill.skillName}
                    className="bg-slate-950 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-bold text-white text-base">{skill.skillName}</h4>
                        <span className="text-xs text-indigo-400">{skill.category}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-extrabold text-emerald-400">{scorePct}%</span>
                        <span className="block text-[10px] text-slate-400">Confidence</span>
                      </div>
                    </div>

                    {/* Score Bar */}
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-3">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full"
                        style={{ width: `${scorePct}%` }}
                      />
                    </div>

                    {/* Mathematical Breakdown */}
                    <p className="text-xs text-slate-400 leading-relaxed bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                      {skill.evidence.justification}
                    </p>

                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800/80 text-[10px] text-slate-400 font-mono text-center">
                      <div>
                        <span className="block text-slate-500">Repo Match</span>
                        <span className="font-bold text-slate-200">{skill.evidence.repoCount} repos</span>
                      </div>
                      <div>
                        <span className="block text-slate-500">Lang Volume</span>
                        <span className="font-bold text-slate-200">{Math.round(skill.evidence.languageMatch * 100)}%</span>
                      </div>
                      <div>
                        <span className="block text-slate-500">Doc Quality</span>
                        <span className="font-bold text-slate-200">{Math.round(skill.evidence.readmeQuality * 100)}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
