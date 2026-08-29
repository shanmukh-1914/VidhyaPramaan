import React, { useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import { Navbar } from './components/Navbar';
import { AuthScreen } from './components/AuthScreen';
import { OverviewView } from './components/OverviewView';
import { GitHubVerifyView } from './components/GitHubVerifyView';
import { LearningPlanView } from './components/LearningPlanView';
import { TutoringView } from './components/TutoringView';
import { AssessmentView } from './components/AssessmentView';
import { CertificateUploadView } from './components/CertificateUploadView';
import { CredentialsView } from './components/CredentialsView';
import { MetricsDashboardView } from './components/MetricsDashboardView';
import { AdminDashboardView } from './components/AdminDashboardView';

export default function App() {
  const { token, activeTab } = useAppStore();

  if (!token) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'overview' && <OverviewView />}
        {activeTab === 'github-verify' && <GitHubVerifyView />}
        {activeTab === 'plan' && <LearningPlanView />}
        {activeTab === 'tutoring' && <TutoringView />}
        {activeTab === 'assessment' && <AssessmentView />}
        {activeTab === 'certificates' && <CertificateUploadView />}
        {activeTab === 'credentials' && <CredentialsView />}
        {activeTab === 'metrics' && <MetricsDashboardView />}
        {activeTab === 'admin' && <AdminDashboardView />}
      </main>
    </div>
  );
}
