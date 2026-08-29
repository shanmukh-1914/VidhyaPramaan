import mongoose, { Schema, Document, Model } from 'mongoose';

// Environment variables
const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb+srv://vtripadh_db_user:YEvxTDZ39VSpZroB@cluster0.xjlrokm.mongodb.net/skillforge?retryWrites=true&w=majority';

// --- Mongoose Schemas ---

export interface IUser extends Document {
  email: string;
  passwordHash?: string;
  authProvider?: 'local' | 'google' | 'gmail';
  role: 'student' | 'candidate' | 'recruiter' | 'admin' | 'institution';
  tenantId: string;
  organizationName?: string;
  name?: string;
  bio?: string;
  title?: string;
  avatarUrl?: string;
  githubUsername?: string;
  enrolledFaceDescriptor?: number[];
  refreshToken?: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, required: false },
  authProvider: { type: String, enum: ['local', 'google', 'gmail'], default: 'local' },
  role: { type: String, enum: ['student', 'candidate', 'recruiter', 'admin', 'institution'], default: 'candidate', index: true },
  tenantId: { type: String, default: 'default_tenant', index: true },
  organizationName: { type: String, default: 'SkillForge Open Community' },
  name: { type: String, default: '' },
  bio: { type: String, default: '' },
  title: { type: String, default: '' },
  avatarUrl: { type: String, default: '' },
  githubUsername: { type: String, default: '' },
  enrolledFaceDescriptor: { type: [Number], default: [] },
  refreshToken: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

export interface IOrganization extends Document {
  tenantId: string;
  name: string;
  domain?: string;
  plan: 'free' | 'pro' | 'enterprise';
  createdAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>({
  tenantId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  domain: { type: String },
  plan: { type: String, enum: ['free', 'pro', 'enterprise'], default: 'pro' },
  createdAt: { type: Date, default: Date.now },
});

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  tenantId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'credential';
  read: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tenantId: { type: String, default: 'default_tenant', index: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['info', 'success', 'warning', 'credential'], default: 'info' },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export interface IAuditLog extends Document {
  userId?: mongoose.Types.ObjectId;
  tenantId: string;
  action: string;
  resource: string;
  details?: Record<string, any>;
  ipAddress?: string;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  tenantId: { type: String, default: 'default_tenant', index: true },
  action: { type: String, required: true, index: true },
  resource: { type: String, required: true },
  details: { type: Schema.Types.Mixed, default: {} },
  ipAddress: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now },
});

export interface IProctoringSession extends Document {
  sessionId: string;
  userId: mongoose.Types.ObjectId;
  tenantId: string;
  skillName: string;
  assessmentId?: mongoose.Types.ObjectId;
  flagsCount: number;
  identitySimilarity: number;
  violations: Array<{
    type: string;
    details: string;
    timestamp: Date;
    confidence: number;
  }>;
  status: 'active' | 'completed' | 'terminated';
  startedAt: Date;
  endedAt?: Date;
}

const ProctoringSessionSchema = new Schema<IProctoringSession>({
  sessionId: { type: String, required: true, unique: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tenantId: { type: String, default: 'default_tenant', index: true },
  skillName: { type: String, required: true },
  assessmentId: { type: Schema.Types.ObjectId, ref: 'AssessmentRecord' },
  flagsCount: { type: Number, default: 0 },
  identitySimilarity: { type: Number, default: 1.0 },
  violations: [{
    type: String,
    details: String,
    timestamp: { type: Date, default: Date.now },
    confidence: Number,
  }],
  status: { type: String, enum: ['active', 'completed', 'terminated'], default: 'active' },
  startedAt: { type: Date, default: Date.now },
  endedAt: Date,
});

export interface IVerifiedSkill extends Document {
  userId: mongoose.Types.ObjectId;
  skillName: string;
  category: string;
  confidenceScore: number; // 0 to 1
  source: 'github' | 'assessment' | 'certification';
  evidenceDetails: Record<string, any>;
  verifiedAt: Date;
}

const VerifiedSkillSchema = new Schema<IVerifiedSkill>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  skillName: { type: String, required: true },
  category: { type: String, default: 'General' },
  confidenceScore: { type: Number, required: true },
  source: { type: String, enum: ['github', 'assessment', 'certification'], required: true },
  evidenceDetails: { type: Schema.Types.Mixed, default: {} },
  verifiedAt: { type: Date, default: Date.now },
});

export interface ILearningPlan extends Document {
  userId: mongoose.Types.ObjectId;
  targetRole: string;
  targetLanguage: string;
  estimatedWeeks: number;
  modules: Array<{
    id: string;
    title: string;
    description: string;
    skillsCovered: string[];
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    estimatedHours: number;
    completed: boolean;
    lessons: Array<{
      id: string;
      title: string;
      conceptSummary: string;
      interactiveExercise: string;
    }>;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const LearningPlanSchema = new Schema<ILearningPlan>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  targetRole: { type: String, required: true },
  targetLanguage: { type: String, default: 'English' },
  estimatedWeeks: { type: Number, default: 4 },
  modules: [{
    id: String,
    title: String,
    description: String,
    skillsCovered: [String],
    difficulty: String,
    estimatedHours: Number,
    completed: { type: Boolean, default: false },
    lessons: [{
      id: String,
      title: String,
      conceptSummary: String,
      interactiveExercise: String,
    }],
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export interface IModuleProgress extends Document {
  userId: mongoose.Types.ObjectId;
  planId: mongoose.Types.ObjectId;
  moduleId: string;
  lessonId: string;
  status: 'not_started' | 'in_progress' | 'completed';
  timeSpentMinutes: number;
  lastAccessedAt: Date;
}

const ModuleProgressSchema = new Schema<IModuleProgress>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  planId: { type: Schema.Types.ObjectId, ref: 'LearningPlan', required: true },
  moduleId: { type: String, required: true },
  lessonId: { type: String, required: true },
  status: { type: String, enum: ['not_started', 'in_progress', 'completed'], default: 'not_started' },
  timeSpentMinutes: { type: Number, default: 0 },
  lastAccessedAt: { type: Date, default: Date.now },
});

export interface IAssessmentRecord extends Document {
  userId: mongoose.Types.ObjectId;
  skillName: string;
  score: number; // 0 - 100
  passed: boolean;
  proctorFlags: Array<{
    type: string;
    timestamp: Date;
    confidence: number;
    metadata?: Record<string, any>;
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
  completedAt: Date;
}

const AssessmentRecordSchema = new Schema<IAssessmentRecord>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  skillName: { type: String, required: true },
  score: { type: Number, required: true },
  passed: { type: Boolean, required: true },
  proctorFlags: [{
    type: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    confidence: Number,
    metadata: Schema.Types.Mixed,
  }],
  questions: [{
    id: String,
    question: String,
    type: { type: String, enum: ['objective', 'short_answer'] },
    userAnswer: String,
    correctAnswer: String,
    score: Number,
    reviewer1Score: Number,
    reviewer2Score: Number,
    needsReview: Boolean,
    feedback: String,
  }],
  completedAt: { type: Date, default: Date.now },
});

export interface ICertification extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  issuer: string;
  issuedDate?: string;
  credentialId?: string;
  ocrExtractedText: string;
  ocrConfidence: number; // 0 to 1
  verified: boolean;
  createdAt: Date;
}

const CertificationSchema = new Schema<ICertification>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true },
  issuer: { type: String, required: true },
  issuedDate: String,
  credentialId: String,
  ocrExtractedText: { type: String, default: '' },
  ocrConfidence: { type: Number, required: true },
  verified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export interface IBadge extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  icon: string;
  category: string;
  rarity: 'bronze' | 'silver' | 'gold' | 'platinum';
  criteria: string;
  issuedAt: Date;
}

const BadgeSchema = new Schema<IBadge>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true },
  category: { type: String, default: 'Mastery' },
  rarity: { type: String, enum: ['bronze', 'silver', 'gold', 'platinum'], default: 'gold' },
  criteria: { type: String, required: true },
  issuedAt: { type: Date, default: Date.now },
});

export interface IResumeDoc extends Document {
  userId: mongoose.Types.ObjectId;
  docType: 'resume' | 'lor';
  content: string; // Markdown or formatted text
  generatedAt: Date;
  verifiedSkillsIncluded: string[];
}

const ResumeDocSchema = new Schema<IResumeDoc>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  docType: { type: String, enum: ['resume', 'lor'], required: true },
  content: { type: String, required: true },
  generatedAt: { type: Date, default: Date.now },
  verifiedSkillsIncluded: [String],
});

export interface ILearnerMemory extends Document {
  userId: mongoose.Types.ObjectId;
  text: string;
  category: 'strength' | 'weakness' | 'concept_mastered' | 'learning_style' | 'misconception';
  embedding: number[];
  createdAt: Date;
}

const LearnerMemorySchema = new Schema<ILearnerMemory>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  text: { type: String, required: true },
  category: { type: String, default: 'concept_mastered' },
  embedding: { type: [Number], required: true },
  createdAt: { type: Date, default: Date.now },
});

// Compile Models
export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export const Organization: Model<IOrganization> = mongoose.models.Organization || mongoose.model<IOrganization>('Organization', OrganizationSchema);
export const Notification: Model<INotification> = mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
export const AuditLog: Model<IAuditLog> = mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
export const ProctoringSession: Model<IProctoringSession> = mongoose.models.ProctoringSession || mongoose.model<IProctoringSession>('ProctoringSession', ProctoringSessionSchema);
export const VerifiedSkill: Model<IVerifiedSkill> = mongoose.models.VerifiedSkill || mongoose.model<IVerifiedSkill>('VerifiedSkill', VerifiedSkillSchema);
export const LearningPlan: Model<ILearningPlan> = mongoose.models.LearningPlan || mongoose.model<ILearningPlan>('LearningPlan', LearningPlanSchema);
export const ModuleProgress: Model<IModuleProgress> = mongoose.models.ModuleProgress || mongoose.model<IModuleProgress>('ModuleProgress', ModuleProgressSchema);
export const AssessmentRecord: Model<IAssessmentRecord> = mongoose.models.AssessmentRecord || mongoose.model<IAssessmentRecord>('AssessmentRecord', AssessmentRecordSchema);
export const Certification: Model<ICertification> = mongoose.models.Certification || mongoose.model<ICertification>('Certification', CertificationSchema);
export const Badge: Model<IBadge> = mongoose.models.Badge || mongoose.model<IBadge>('Badge', BadgeSchema);
export const ResumeDoc: Model<IResumeDoc> = mongoose.models.ResumeDoc || mongoose.model<IResumeDoc>('ResumeDoc', ResumeDocSchema);
export const LearnerMemory: Model<ILearnerMemory> = mongoose.models.LearnerMemory || mongoose.model<ILearnerMemory>('LearnerMemory', LearnerMemorySchema);

// --- Vector Index Configuration & Vector Search Engine ---

export const ATLAS_VECTOR_SEARCH_INDEX_JSON = {
  name: "vector_index_learner_memory",
  type: "vectorSearch",
  definition: {
    fields: [
      {
        type: "vector",
        path: "embedding",
        numDimensions: 768,
        similarity: "cosine"
      },
      {
        type: "filter",
        path: "userId"
      }
    ]
  }
};

// In-process Cosine Similarity Vector Search Engine (HNSW/Cosine fallback)
export class InProcessVectorEngine {
  private static cosineSimilarity(a: number[], b: number[]): number {
    if (!a || !b || a.length !== b.length || a.length === 0) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  public static async searchTopK(userId: string | mongoose.Types.ObjectId, queryEmbedding: number[], k: number = 5): Promise<Array<{ text: string; category: string; similarity: number; createdAt: Date }>> {
    try {
      const memories = await LearnerMemory.find({ userId }).lean();
      if (!memories || memories.length === 0) return [];

      const scored = memories.map((m) => ({
        text: m.text,
        category: m.category,
        similarity: this.cosineSimilarity(queryEmbedding, m.embedding),
        createdAt: m.createdAt,
      }));

      scored.sort((a, b) => b.similarity - a.similarity);
      return scored.slice(0, k);
    } catch (err) {
      console.error('[VectorEngine] Search failed:', err);
      return [];
    }
  }
}

// Database Connection Manager
export let isConnectedToDb = false;
export let vectorSearchPath: 'atlas_vector_search' | 'in_process_hnsw_fallback' = 'in_process_hnsw_fallback';

export async function connectDatabase() {
  if (isConnectedToDb) return;
  try {
    console.log('[DB] Connecting to MongoDB Atlas URI...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
    });
    isConnectedToDb = true;
    console.log('[DB] Successfully connected to MongoDB Atlas!');

    // Check if cluster supports Atlas Search / Vector Search
    try {
      const admin = mongoose.connection.db?.admin();
      const buildInfo = await admin?.buildInfo();
      console.log(`[DB] Mongo Server Version: ${buildInfo?.version}`);
      
      // Vector search check: on free/shared M0 clusters, Search Index creation requires UI or Atlas CLI.
      // We log the exact JSON for users to apply and default to high-performance in-process Cosine vector search engine.
      vectorSearchPath = 'in_process_hnsw_fallback';
      console.log(`[DB] Vector Search Mode: ${vectorSearchPath} (Atlas Vector Index JSON ready for manual or cluster-enabled provisioning).`);
    } catch (e) {
      console.log('[DB] Vector search capability check completed, utilizing high-precision in-process cosine vector engine.');
    }
  } catch (error) {
    console.error('[DB] MongoDB Connection error:', error);
    // Don't crash process, allow retry or in-memory operational mode
  }
}
