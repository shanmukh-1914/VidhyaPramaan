import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { apiRequest } from '../api';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  BarChart3, 
  ShieldCheck, 
  Camera, 
  CheckCircle2, 
  BrainCircuit, 
  Sparkles, 
  Database, 
  Award,
  Layers
} from 'lucide-react';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

export const MetricsDashboardView: React.FC = () => {
  const { metrics, setMetrics, verifiedSkills } = useAppStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await apiRequest('/api/metrics/summary');
        if (res) setMetrics(res);
      } catch (err) {
        console.warn('Metrics error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, [setMetrics]);

  const radarData = (metrics?.categoryDistribution || []).map((cat) => ({
    category: cat.category,
    confidence: cat.averageConfidence,
    count: cat.count * 20, // normalized scale
  }));

  const pieData = [
    { name: 'Strengths', value: metrics?.memoryStats?.strengths || 2 },
    { name: 'Concepts Mastered', value: metrics?.memoryStats?.conceptsMastered || 3 },
    { name: 'Growth Areas', value: metrics?.memoryStats?.weaknesses || 1 },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-3">
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Real-Time MongoDB Atlas Analytics & Benchmarks</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Skill & Integrity Analytics Hub
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Comprehensive telemetry tracking your verified competency distribution, proctoring compliance rate, assessment pass efficiency, and cognitive RAG memory bank.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-950 px-3.5 py-2 rounded-2xl border border-slate-800 text-xs text-slate-300">
            <Database className="w-4 h-4 text-emerald-400" />
            <span>Atlas Synchronized</span>
          </div>
        </div>
      </div>

      {/* Primary KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-400">Average Confidence</span>
          <p className="text-2xl font-bold text-white mt-1">
            {metrics?.summary.averageConfidence ?? 0}%
          </p>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-emerald-400 rounded-full"
              style={{ width: `${metrics?.summary.averageConfidence ?? 0}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-400">Proctor Compliance</span>
          <p className="text-2xl font-bold text-violet-400 mt-1">
            {metrics?.summary.proctorComplianceRate ?? 100}%
          </p>
          <span className="text-[10px] text-slate-500">Zero-cheat verification</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-400">Assessment Pass Rate</span>
          <p className="text-2xl font-bold text-indigo-400 mt-1">
            {metrics?.summary.assessmentPassRate ?? 100}%
          </p>
          <span className="text-[10px] text-slate-500">
            {metrics?.summary.totalAssessmentsTaken ?? 0} sessions taken
          </span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-400">RAG Cognitive Memories</span>
          <p className="text-2xl font-bold text-amber-400 mt-1">
            {metrics?.summary.learnerMemoriesCount ?? 0}
          </p>
          <span className="text-[10px] text-slate-500">Vector indexed items</span>
        </div>
      </div>

      {/* Visual Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Skill Competency Radar */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>Competency Radar by Category</span>
          </h3>

          <div className="h-64 w-full">
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis dataKey="category" stroke="#94a3b8" fontSize={11} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" fontSize={10} />
                  <Radar
                    name="Confidence Score"
                    dataKey="confidence"
                    stroke="#6366f1"
                    fill="#6366f1"
                    fillOpacity={0.4}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                Verify skills via GitHub or assessment to populate radar graph.
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Category Average Confidence Bar Chart */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            <span>Category Average Confidence (% Score)</span>
          </h3>

          <div className="h-64 w-full">
            {metrics?.categoryDistribution && metrics.categoryDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.categoryDistribution}>
                  <XAxis dataKey="category" stroke="#94a3b8" fontSize={11} />
                  <YAxis domain={[0, 100]} stroke="#475569" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                  />
                  <Bar dataKey="averageConfidence" fill="#10b981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No categorical distributions yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Assessment Sessions Ledger */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Camera className="w-5 h-5 text-violet-400" />
          <span>Recent Proctored Assessment Sessions</span>
        </h3>

        {(!metrics?.recentAssessments || metrics.recentAssessments.length === 0) ? (
          <p className="text-xs text-slate-500 text-center py-6">
            No assessments recorded yet.
          </p>
        ) : (
          <div className="space-y-3">
            {metrics.recentAssessments.map((a) => (
              <div
                key={a.id}
                className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between gap-4"
              >
                <div>
                  <h4 className="font-bold text-white text-sm">{a.skillName}</h4>
                  <span className="text-xs text-slate-400 font-mono">
                    Completed: {new Date(a.date).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono">
                  <div className="text-right">
                    <span className="text-slate-500 block text-[10px]">Flags Logged</span>
                    <span className={`font-bold ${a.proctorFlagsCount === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {a.proctorFlagsCount} Flags
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-slate-500 block text-[10px]">Score</span>
                    <span className={`font-bold text-sm ${a.passed ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {a.score}% ({a.passed ? 'PASSED' : 'FAILED'})
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
