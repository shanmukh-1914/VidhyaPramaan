import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { apiRequest } from '../api';
import { AudioVoiceRecorder } from '../utils/audioRecorder';
import { 
  BookOpen, 
  Sparkles, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Target, 
  ChevronDown, 
  ChevronUp, 
  AlertCircle, 
  Globe, 
  Layers,
  ArrowRight,
  Mic,
  Search,
  ExternalLink
} from 'lucide-react';

const SUGGESTED_ROLES = [
  'Full-Stack AI Application Engineer',
  'Cloud Systems & DevOps Architect',
  'Machine Learning & LLM Systems Engineer',
  'Senior Backend & Microservices Architect',
  'Frontend Performance & Design Technologist',
];

export const LearningPlanView: React.FC = () => {
  const { learningPlan, setLearningPlan, verifiedSkills, language } = useAppStore();
  const [targetRole, setTargetRole] = useState(learningPlan?.targetRole || 'Full-Stack AI Application Engineer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [completedLessons, setCompletedLessons] = useState<Record<string, boolean>>({});

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recorderRef = useRef<AudioVoiceRecorder | null>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (recorderRef.current) recorderRef.current.cancelRecording();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startVoiceInput = async () => {
    try {
      setError(null);
      const recorder = new AudioVoiceRecorder();
      recorderRef.current = recorder;
      await recorder.startRecording();
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Microphone access failed.');
    }
  };

  const stopVoiceInput = async () => {
    if (!recorderRef.current || !isRecording) return;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    setIsTranscribing(true);

    try {
      const res = await recorderRef.current.stopAndTranscribe();
      if (res.text) {
        setTargetRole(res.text);
      }
    } catch (err: any) {
      setError(err.message || 'Voice transcription failed.');
    } finally {
      setIsTranscribing(false);
      recorderRef.current = null;
    }
  };

  const cancelVoiceInput = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (recorderRef.current) recorderRef.current.cancelRecording();
    setIsRecording(false);
    setIsTranscribing(false);
  };

  useEffect(() => {
    const fetchCurrentPlan = async () => {
      try {
        const res = await apiRequest('/api/plan/current');
        if (res.plan) {
          setLearningPlan(res.plan);
          // Pre-expand first module
          if (res.plan.modules?.[0]) {
            setExpandedModules({ [res.plan.modules[0].id]: true });
          }
        }
        if (res.progressList) {
          const map: Record<string, boolean> = {};
          res.progressList.forEach((p: any) => {
            if (p.status === 'completed') map[`${p.moduleId}-${p.lessonId}`] = true;
          });
          setCompletedLessons(map);
        }
      } catch (err) {
        console.warn('Plan fetch error:', err);
      }
    };
    fetchCurrentPlan();
  }, [setLearningPlan]);

  const handleGeneratePlan = async (roleOverride?: string) => {
    const role = roleOverride || targetRole;
    if (!role.trim()) {
      setError('Please enter a target engineering role.');
      return;
    }

    setTargetRole(role);
    setError(null);
    setLoading(true);

    try {
      const res = await apiRequest('/api/plan/generate', {
        method: 'POST',
        body: JSON.stringify({
          targetRole: role,
          targetLanguage: language,
        }),
      });

      if (res.plan) {
        setLearningPlan(res.plan);
        if (res.plan.modules?.[0]) {
          setExpandedModules({ [res.plan.modules[0].id]: true });
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate learning plan.');
    } finally {
      setLoading(false);
    }
  };

  const toggleLesson = async (moduleId: string, lessonId: string) => {
    const key = `${moduleId}-${lessonId}`;
    const newCompleted = !completedLessons[key];
    setCompletedLessons((prev) => ({ ...prev, [key]: newCompleted }));

    if (learningPlan?._id) {
      try {
        await apiRequest('/api/plan/toggle-lesson', {
          method: 'POST',
          body: JSON.stringify({
            planId: learningPlan._id,
            moduleId,
            lessonId,
            completed: newCompleted,
          }),
        });
      } catch (e) {
        console.warn('Failed to sync progress:', e);
      }
    }
  };

  const toggleModuleAccordion = (modId: string) => {
    setExpandedModules((prev) => ({ ...prev, [modId]: !prev[modId] }));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Plan Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Grounded in {verifiedSkills.length} Verified DB Skills</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Adaptive Goal Curriculum Generator
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Gemini evaluates your verified repository competencies and synthesizes an optimal multi-module path in {language}.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-xs text-slate-300">
            <Globe className="w-4 h-4 text-indigo-400" />
            <span>Language: <strong>{language}</strong></span>
          </div>
        </div>

        {/* Role input form */}
        <div className="mt-6 space-y-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleGeneratePlan();
            }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <div className="relative flex-1 flex items-center">
              <Target className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              {isRecording ? (
                <div className="w-full pl-11 pr-24 py-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-between animate-pulse">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                    <span className="text-xs font-semibold text-rose-300">
                      Listening to your target career goal ({recordingSeconds}s)...
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={cancelVoiceInput}
                      className="text-xs text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={stopVoiceInput}
                      className="text-xs font-semibold text-white px-2.5 py-0.5 rounded-lg bg-rose-600 hover:bg-rose-500"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : isTranscribing ? (
                <div className="w-full pl-11 pr-4 py-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center gap-2 text-xs text-indigo-300">
                  <span className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  <span>Transcribing career goal with <strong>gemini-3.5-transcribe</strong>...</span>
                </div>
              ) : (
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="Enter career goal or role (e.g. Staff AI Platform Engineer)..."
                  className="w-full pl-11 pr-12 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              )}

              {!isRecording && !isTranscribing && (
                <button
                  type="button"
                  onClick={startVoiceInput}
                  title="Speak career goal (transcribed via gemini-3.5-transcribe)"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-indigo-400 rounded-xl transition-all cursor-pointer"
                >
                  <Mic className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || isRecording || isTranscribing}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer shrink-0"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Adaptive Plan</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Pre-fill Roles */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-slate-400">Popular roles:</span>
            {SUGGESTED_ROLES.map((r) => (
              <button
                key={r}
                onClick={() => handleGeneratePlan(r)}
                className="text-xs px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors cursor-pointer"
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mt-4 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Google Search Grounding Sources (if available) */}
      {learningPlan?.searchSources && learningPlan.searchSources.length > 0 && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-sm space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-300">
            <Search className="w-4 h-4 text-blue-400" />
            <span>Google Search Grounding (gemini-3.5-flash with googleSearch)</span>
          </div>
          <p className="text-xs text-slate-400">
            Curriculum syllabus is grounded against real-time 2026 industry competencies and live tech documentation:
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {learningPlan.searchSources.map((source, sIdx) => (
              <a
                key={sIdx}
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-xs text-blue-300 hover:text-blue-200 transition-colors"
              >
                <ExternalLink className="w-3 h-3 opacity-70" />
                <span className="truncate max-w-xs">{source.title || source.url}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Plan Modules Display */}
      {learningPlan && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                <span>Target: {learningPlan.targetRole}</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Estimated duration: ~{learningPlan.estimatedWeeks} weeks · Instruction Language: {learningPlan.targetLanguage}
              </p>
            </div>

            <span className="text-xs px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300 font-semibold">
              {learningPlan.modules?.length || 0} Modules
            </span>
          </div>

          <div className="space-y-4">
            {learningPlan.modules?.map((module, mIdx) => {
              const isExpanded = !!expandedModules[module.id];
              const moduleLessonsCount = module.lessons?.length || 0;
              const moduleCompletedCount = (module.lessons || []).filter(
                (l) => completedLessons[`${module.id}-${l.id}`]
              ).length;

              return (
                <div
                  key={module.id || mIdx}
                  className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-sm transition-all"
                >
                  {/* Module Header Bar */}
                  <div
                    onClick={() => toggleModuleAccordion(module.id)}
                    className="p-6 cursor-pointer flex items-start sm:items-center justify-between gap-4 hover:bg-slate-850/50 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm shrink-0 mt-0.5 sm:mt-0">
                        {mIdx + 1}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-bold text-white text-base">{module.title}</h3>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider border ${
                            module.difficulty === 'advanced'
                              ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                              : module.difficulty === 'intermediate'
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                              : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                          }`}>
                            {module.difficulty}
                          </span>
                          <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3" />
                            {module.estimatedHours}h
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2">{module.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right hidden sm:block">
                        <span className="text-xs font-bold text-indigo-300 font-mono">
                          {moduleCompletedCount}/{moduleLessonsCount} Done
                        </span>
                        <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
                          <div
                            className="h-full bg-emerald-400 rounded-full"
                            style={{
                              width: `${moduleLessonsCount > 0 ? (moduleCompletedCount / moduleLessonsCount) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Module Lessons Accordion Body */}
                  {isExpanded && (
                    <div className="px-6 pb-6 pt-2 border-t border-slate-800/60 space-y-3">
                      {/* Skills Covered Pills */}
                      {module.skillsCovered && module.skillsCovered.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 mb-3">
                          <span className="text-[11px] text-slate-500 font-semibold mr-1">Skills:</span>
                          {module.skillsCovered.map((skill) => (
                            <span
                              key={skill}
                              className="text-[11px] px-2.5 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-mono"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Lessons List */}
                      <div className="space-y-3">
                        {module.lessons?.map((lesson, lIdx) => {
                          const isDone = !!completedLessons[`${module.id}-${lesson.id}`];
                          return (
                            <div
                              key={lesson.id || lIdx}
                              className={`p-4 rounded-2xl border transition-all ${
                                isDone
                                  ? 'bg-slate-950/40 border-emerald-500/20'
                                  : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <button
                                  onClick={() => toggleLesson(module.id, lesson.id)}
                                  className="mt-0.5 text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
                                >
                                  {isDone ? (
                                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                  ) : (
                                    <Circle className="w-5 h-5 text-slate-600" />
                                  )}
                                </button>
                                <div className="space-y-1.5 flex-1">
                                  <div className="flex items-center justify-between">
                                    <h4 className={`text-sm font-semibold ${isDone ? 'text-slate-400 line-through' : 'text-white'}`}>
                                      {lesson.title}
                                    </h4>
                                    <span className="text-[10px] text-slate-500 font-mono">
                                      Lesson {lIdx + 1}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-400 leading-relaxed">
                                    {lesson.conceptSummary}
                                  </p>

                                  {lesson.interactiveExercise && (
                                    <div className="mt-2 p-2.5 bg-slate-900 rounded-xl border border-slate-800/80 text-xs text-indigo-300 flex items-start gap-2">
                                      <span className="font-bold text-indigo-400 shrink-0">Exercise:</span>
                                      <span>{lesson.interactiveExercise}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
