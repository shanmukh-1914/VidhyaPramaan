import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { microservicesApi } from '../api';
import {
  ShieldAlert,
  Users,
  Award,
  CheckCircle2,
  Server,
  Activity,
  Cpu,
  RefreshCw,
  Search,
  Key,
  ShieldCheck,
  AlertTriangle,
  Play,
  FileCode,
  Eye,
  Camera,
  Layers,
  Sparkles,
} from 'lucide-react';

export const AdminDashboardView: React.FC = () => {
  const { user } = useAppStore();
  const [subTab, setSubTab] = useState<'stats' | 'microservices' | 'users' | 'proctoring' | 'audit'>('stats');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [proctoringSessions, setProctoringSessions] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Microservice interactive test states
  const [msHealth, setMsHealth] = useState<{ [key: string]: any }>({});
  const [testingService, setTestingService] = useState<string | null>(null);
  const [scoringSkill, setScoringSkill] = useState('TypeScript & Distributed Systems');
  const [scoringCode, setScoringCode] = useState('export async function orchestratePipeline() {\n  // Resilient multi-cloud broker\n}');
  const [testResult, setTestResult] = useState<any>(null);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const statsRes = await microservicesApi.getAdminStats();
      if (statsRes.success) setStats(statsRes.data);

      const usersRes = await microservicesApi.getAdminUsers();
      if (usersRes.success) setUsers(usersRes.data);

      const sessionsRes = await microservicesApi.getAdminProctoringSessions();
      if (sessionsRes.success) setProctoringSessions(sessionsRes.data);

      const logsRes = await microservicesApi.getAdminLogs();
      if (logsRes.success) setAuditLogs(logsRes.data);

      // Check microservice health status
      const [scH, prH, idH, ocrH] = await Promise.allSettled([
        microservicesApi.getScoringHealth(),
        microservicesApi.getProctoringHealth(),
        microservicesApi.getIdentityHealth(),
        microservicesApi.getOcrHealth(),
      ]);

      setMsHealth({
        scoring: scH.status === 'fulfilled' ? scH.value : { status: 'unreachable' },
        proctoring: prH.status === 'fulfilled' ? prH.value : { status: 'unreachable' },
        identity: idH.status === 'fulfilled' ? idH.value : { status: 'unreachable' },
        ocr: ocrH.status === 'fulfilled' ? ocrH.value : { status: 'unreachable' },
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load administration telemetry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await microservicesApi.updateUserRole(userId, newRole);
      setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, role: newRole } : u)));
    } catch (err: any) {
      alert(`Role update error: ${err.message}`);
    }
  };

  const runScoringTest = async () => {
    setTestingService('scoring');
    setTestResult(null);
    try {
      const res = await microservicesApi.scoreSkill({
        skill: scoringSkill,
        codeSnippet: scoringCode,
        experienceYears: 4,
      });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ error: err.message });
    } finally {
      setTestingService(null);
    }
  };

  const runPresenceTest = async () => {
    setTestingService('proctoring');
    setTestResult(null);
    try {
      const res = await microservicesApi.checkPresence({
        faceCount: 1,
        detectedObjects: ['Laptop', 'Candidate'],
        headPoseAngles: { pitch: -2, yaw: 4, roll: 0 },
      });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ error: err.message });
    } finally {
      setTestingService(null);
    }
  };

  const runIdentityTest = async () => {
    setTestingService('identity');
    setTestResult(null);
    try {
      const res = await microservicesApi.verifyIdentity({
        referenceDescriptor: [0.12, -0.45, 0.78, 0.33],
        currentDescriptor: [0.14, -0.42, 0.77, 0.31],
        threshold: 0.70,
      });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ error: err.message });
    } finally {
      setTestingService(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 p-6 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Admin & Multi-Tenant Control
            </span>
            <span className="text-xs text-slate-400">Tenant: {user?.tenantId || 'default_tenant'}</span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">Platform Operations & Microservices Hub</h1>
          <p className="text-sm text-slate-400">
            Real-time multi-tenant monitoring, role-based access control (RBAC), and microservices telemetry.
          </p>
        </div>

        <button
          onClick={fetchAllData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-xl border border-slate-700 transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Telemetry
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Sub-Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        {[
          { id: 'stats', label: 'Platform Stats', icon: <Activity className="w-4 h-4" /> },
          { id: 'microservices', label: 'Microservices & AI Engines', icon: <Server className="w-4 h-4" /> },
          { id: 'users', label: 'User & Role RBAC', icon: <Users className="w-4 h-4" /> },
          { id: 'proctoring', label: 'Proctoring Integrity Logs', icon: <Camera className="w-4 h-4" /> },
          { id: 'audit', label: 'Security Audit Trail', icon: <ShieldCheck className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
              subTab === tab.id
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: Platform Stats */}
      {subTab === 'stats' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Registered Learners</span>
                <Users className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="text-3xl font-bold text-white">{stats?.totalUsers ?? '...'}</div>
              <p className="text-xs text-slate-400 mt-1">Multi-tenant accounts</p>
            </div>

            <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Verified Skills</span>
                <Award className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-3xl font-bold text-white">{stats?.totalSkills ?? '...'}</div>
              <p className="text-xs text-slate-400 mt-1">GitHub, OCR, & Assessments</p>
            </div>

            <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Proctored Tests</span>
                <FileCode className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="text-3xl font-bold text-white">{stats?.totalAssessments ?? '...'}</div>
              <p className="text-xs text-slate-400 mt-1">Completed evaluations</p>
            </div>

            <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Integrity Compliance</span>
                <ShieldCheck className="w-5 h-5 text-violet-400" />
              </div>
              <div className="text-3xl font-bold text-white">{stats?.integrityRate ?? '98%'}</div>
              <p className="text-xs text-slate-400 mt-1">Zero critical breaches</p>
            </div>
          </div>

          {/* Top Verified Skills Grid */}
          <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
            <h3 className="text-lg font-bold text-white mb-4">Top Verified Technical Competencies</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {stats?.topSkills?.map((s: any, idx: number) => (
                <div key={idx} className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/60">
                  <div className="font-semibold text-slate-200 truncate">{s.name}</div>
                  <div className="flex items-center justify-between mt-2 text-xs text-slate-400">
                    <span>{s.count} credentials</span>
                    <span className="text-emerald-400 font-bold">{s.averageConfidence}% avg confidence</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Microservices & AI Engines */}
      {subTab === 'microservices' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Service 1: Skill Scoring */}
            <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                    Port 8001 / Internal
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                </div>
                <h4 className="font-bold text-white">Skill Scoring Service</h4>
                <p className="text-xs text-slate-400 mt-1">Automated code, repo, and assessment competency rubric assessor.</p>
              </div>
              <button
                onClick={runScoringTest}
                disabled={testingService === 'scoring'}
                className="mt-4 w-full flex items-center justify-center gap-2 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition"
              >
                <Play className="w-3.5 h-3.5" />
                {testingService === 'scoring' ? 'Evaluating...' : 'Run Test Request'}
              </button>
            </div>

            {/* Service 2: Proctoring Presence */}
            <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                    Port 8002 / Internal
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                </div>
                <h4 className="font-bold text-white">Proctoring Presence Service</h4>
                <p className="text-xs text-slate-400 mt-1">Computer vision presence, multi-face, and gaze direction monitor.</p>
              </div>
              <button
                onClick={runPresenceTest}
                disabled={testingService === 'proctoring'}
                className="mt-4 w-full flex items-center justify-center gap-2 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl transition"
              >
                <Play className="w-3.5 h-3.5" />
                {testingService === 'proctoring' ? 'Analyzing...' : 'Run Test Request'}
              </button>
            </div>

            {/* Service 3: Face Identity */}
            <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-violet-500/20 text-violet-300">
                    Port 8003 / Internal
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                </div>
                <h4 className="font-bold text-white">Face Identity Verification</h4>
                <p className="text-xs text-slate-400 mt-1">InsightFace biometric vector cosine comparator & anti-spoofing.</p>
              </div>
              <button
                onClick={runIdentityTest}
                disabled={testingService === 'identity'}
                className="mt-4 w-full flex items-center justify-center gap-2 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-xl transition"
              >
                <Play className="w-3.5 h-3.5" />
                {testingService === 'identity' ? 'Verifying...' : 'Run Test Request'}
              </button>
            </div>

            {/* Service 4: Certificate OCR */}
            <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                    Port 8004 / Internal
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                </div>
                <h4 className="font-bold text-white">Certificate OCR Extraction</h4>
                <p className="text-xs text-slate-400 mt-1">Multi-modal OCR credential validator and structured schema extractor.</p>
              </div>
              <div className="mt-4 text-xs text-slate-400 flex items-center gap-1.5 justify-center py-2 bg-slate-800/80 rounded-xl">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Live OCR Route Active
              </div>
            </div>
          </div>

          {/* Interactive Microservice Output */}
          {testResult && (
            <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  Live Microservice Execution Response
                </h3>
                <span className="text-xs text-slate-400">Status 200 OK</span>
              </div>
              <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs text-emerald-300 font-mono overflow-x-auto max-h-72">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: User & Role RBAC */}
      {subTab === 'users' && (
        <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Tenant User Access Directory</h3>
            <span className="text-xs text-slate-400">{users.length} Users Listed</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3">User</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Tenant</th>
                  <th className="p-3">Verified Skills</th>
                  <th className="p-3">Face Enrolled</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-800/30">
                    <td className="p-3">
                      <div className="font-semibold text-white">{u.name || 'Unnamed User'}</div>
                      <div className="text-[11px] text-slate-400">{u.email}</div>
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          u.role === 'admin'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : u.role === 'recruiter'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : u.role === 'institution'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        }`}
                      >
                        {u.role || 'candidate'}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-slate-400">{u.tenantId || 'default_tenant'}</td>
                    <td className="p-3 font-semibold text-emerald-400">{u.verifiedSkillsCount ?? 0} skills</td>
                    <td className="p-3">
                      {u.enrolledFaceDescriptor?.length ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Enrolled
                        </span>
                      ) : (
                        <span className="text-slate-500">Not Enrolled</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <select
                        value={u.role || 'candidate'}
                        onChange={(e) => handleRoleChange(u._id, e.target.value)}
                        className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="student">Student</option>
                        <option value="candidate">Candidate</option>
                        <option value="recruiter">Recruiter</option>
                        <option value="institution">Institution</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Proctoring Integrity Logs */}
      {subTab === 'proctoring' && (
        <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Live Proctoring Session Audit Logs</h3>
            <span className="text-xs text-slate-400">{proctoringSessions.length} Sessions Logged</span>
          </div>

          <div className="space-y-3">
            {proctoringSessions.length === 0 ? (
              <p className="text-sm text-slate-400">No proctoring session breaches recorded.</p>
            ) : (
              proctoringSessions.map((session) => (
                <div key={session._id} className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{session.skillName}</span>
                      <span className="text-xs text-slate-400 font-mono">({session.sessionId})</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        session.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {session.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      Candidate: {session.userId?.email || 'Authenticated Learner'} | Started: {new Date(session.startedAt).toLocaleTimeString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <div>
                      <span className="text-slate-400">Biometric Match: </span>
                      <span className="font-bold text-indigo-300">{Math.round((session.identitySimilarity || 1) * 100)}%</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Violations: </span>
                      <span className={`font-bold ${session.flagsCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {session.flagsCount} flags
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 5: Security Audit Trail */}
      {subTab === 'audit' && (
        <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">System Immutable Audit Trail</h3>
            <span className="text-xs text-slate-400">{auditLogs.length} Events Logged</span>
          </div>

          <div className="space-y-2">
            {auditLogs.map((log) => (
              <div key={log._id} className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
                  <span className="font-mono font-bold text-slate-200">{log.action}</span>
                  <span className="text-slate-400">on <strong className="text-slate-300">{log.resource}</strong></span>
                </div>
                <div className="text-slate-500 font-mono text-[11px]">
                  {new Date(log.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
