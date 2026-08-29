export interface User {
  id: string;
  email: string;
  name?: string;
  role?: 'student' | 'candidate' | 'recruiter' | 'admin' | 'institution';
  tenantId?: string;
  organizationName?: string;
  bio?: string;
  title?: string;
  avatarUrl?: string;
  githubUsername?: string;
  authProvider?: 'local' | 'google' | 'gmail';
  hasEnrolledFace?: boolean;
  refreshToken?: string;
  createdAt: string;
}

export interface AdminStats {
  totalUsers: number;
  totalSkills: number;
  totalAssessments: number;
  totalCertifications: number;
  integrityRate: string;
  topSkills: Array<{
    name: string;
    count: number;
    averageConfidence: number;
  }>;
  recentSessions: any[];
  recentAuditLogs: any[];
}

export interface VerifiedSkill {
  _id: string;
  skillName: string;
  category: string;
  confidenceScore: number;
  source: 'github' | 'assessment' | 'certification';
  evidenceDetails?: {
    repoCount?: number;
    languageMatch?: number;
    accountAgeYears?: number;
    readmeQuality?: number;
    justification?: string;
    assessmentScore?: number;
    certificateTitle?: string;
    issuer?: string;
    ocrConfidence?: number;
  };
  verifiedAt: string;
}

export interface LearningModule {
  id: string;
  title: string;
  description: string;
  skillsCovered: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedHours: number;
  completed?: boolean;
  lessons: Array<{
    id: string;
    title: string;
    conceptSummary: string;
    interactiveExercise: string;
  }>;
}

export interface LearningPlan {
  _id: string;
  targetRole: string;
  targetLanguage: string;
  estimatedWeeks: number;
  modules: LearningModule[];
  searchSources?: Array<{ title: string; url: string }>;
  createdAt: string;
}

export interface AssessmentQuestion {
  id: string;
  type: 'objective' | 'short_answer';
  question: string;
  options?: string[];
  points?: number;
}

export interface AssessmentSubmissionResult {
  record: {
    _id: string;
    skillName: string;
    score: number;
    passed: boolean;
    proctorFlags: Array<{
      type: string;
      timestamp: string;
      confidence: number;
      metadata?: { details?: string };
    }>;
    questions: Array<{
      id: string;
      question: string;
      type: 'objective' | 'short_answer';
      userAnswer: string;
      correctAnswer?: string;
      score: number;
      reviewer1Score?: number;
      reviewer2Score?: number;
      needsReview?: boolean;
      feedback: string;
    }>;
    completedAt: string;
  };
  finalPercentage: number;
  passed: boolean;
  verifiedSkill?: VerifiedSkill;
}

export interface Certification {
  _id: string;
  title: string;
  issuer: string;
  issuedDate?: string;
  credentialId?: string;
  ocrExtractedText: string;
  ocrConfidence: number;
  verified: boolean;
  createdAt: string;
}

export interface Badge {
  _id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  rarity: 'bronze' | 'silver' | 'gold' | 'platinum';
  criteria: string;
  issuedAt: string;
}

export interface ResumeDoc {
  _id: string;
  docType: 'resume' | 'lor';
  content: string;
  verifiedSkillsIncluded: string[];
  generatedAt: string;
}

export interface MetricsSummary {
  summary: {
    totalVerifiedSkills: number;
    averageConfidence: number;
    totalAssessmentsTaken: number;
    assessmentPassRate: number;
    proctorComplianceRate: number;
    certificationsVerified: number;
    badgesEarned: number;
    learnerMemoriesCount: number;
    planProgressPercentage: number;
  };
  categoryDistribution: Array<{
    category: string;
    count: number;
    averageConfidence: number;
  }>;
  memoryStats: {
    total: number;
    strengths: number;
    weaknesses: number;
    conceptsMastered: number;
  };
  recentSkills: Array<{
    name: string;
    category: string;
    score: number;
    source: string;
    date: string;
  }>;
  recentAssessments: Array<{
    id: string;
    skillName: string;
    score: number;
    passed: boolean;
    proctorFlagsCount: number;
    date: string;
  }>;
}
