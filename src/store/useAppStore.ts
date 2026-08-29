import { create } from 'zustand';
import { User, VerifiedSkill, LearningPlan, Certification, Badge, ResumeDoc, MetricsSummary } from '../types';

export type ActiveTab = 'overview' | 'github-verify' | 'plan' | 'tutoring' | 'assessment' | 'certificates' | 'credentials' | 'metrics' | 'admin';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'tutor';
  text: string;
  timestamp: string;
  isStreaming?: boolean;
  retrievedMemoriesCount?: number;
  searchSources?: Array<{ title: string; url: string }>;
  searchQueries?: string[];
}

interface AppState {
  token: string | null;
  user: User | null;
  activeTab: ActiveTab;
  language: string;
  verifiedSkills: VerifiedSkill[];
  learningPlan: LearningPlan | null;
  certifications: Certification[];
  badges: Badge[];
  savedDocs: ResumeDoc[];
  metrics: MetricsSummary | null;
  chatMessages: ChatMessage[];
  isChatStreaming: boolean;
  
  // Proctoring session state
  isProctoringActive: boolean;
  proctorFlags: Array<{ type: string; details: string; timestamp: string; confidence: number }>;
  identitySimilarity: number;
  faceCount: number;

  // Actions
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  setActiveTab: (tab: ActiveTab) => void;
  setLanguage: (lang: string) => void;
  setVerifiedSkills: (skills: VerifiedSkill[]) => void;
  setLearningPlan: (plan: LearningPlan | null) => void;
  setCertifications: (certs: Certification[]) => void;
  setBadges: (badges: Badge[]) => void;
  setSavedDocs: (docs: ResumeDoc[]) => void;
  setMetrics: (metrics: MetricsSummary | null) => void;
  
  // Chat actions
  addChatMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  appendStreamChunk: (chunk: string) => void;
  finishStream: (retrievedMemoriesCount?: number, searchSources?: Array<{ title: string; url: string }>, searchQueries?: string[]) => void;
  setStreamSources: (sources: Array<{ title: string; url: string }>, queries: string[]) => void;
  clearChat: () => void;

  // Proctoring actions
  setProctoringActive: (active: boolean) => void;
  addProctorFlag: (flag: { type: string; details: string; timestamp: string; confidence: number }) => void;
  updateProctorStatus: (identitySimilarity: number, faceCount: number) => void;
  clearProctorFlags: () => void;
}

const TOKEN_KEY = 'skillforge_auth_token';
const USER_KEY = 'skillforge_user';

export const useAppStore = create<AppState>((set, get) => ({
  token: localStorage.getItem(TOKEN_KEY),
  user: (() => {
    try {
      const stored = localStorage.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })(),
  activeTab: 'overview',
  language: 'English',
  verifiedSkills: [],
  learningPlan: null,
  certifications: [],
  badges: [],
  savedDocs: [],
  metrics: null,
  chatMessages: [
    {
      id: 'welcome-1',
      sender: 'tutor',
      text: "Hello! I'm your SkillForge AI Master Tutor. I'm connected to your verified skills profile and RAG cognitive memory bank. What concept or problem would you like to explore together today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ],
  isChatStreaming: false,
  isProctoringActive: false,
  proctorFlags: [],
  identitySimilarity: 1.0,
  faceCount: 1,

  setAuth: (token, user) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ token, user });
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    set({
      token: null,
      user: null,
      verifiedSkills: [],
      learningPlan: null,
      certifications: [],
      badges: [],
      savedDocs: [],
      metrics: null,
      activeTab: 'overview',
    });
  },

  setActiveTab: (activeTab) => set({ activeTab }),
  setLanguage: (language) => set({ language }),
  setVerifiedSkills: (verifiedSkills) => set({ verifiedSkills }),
  setLearningPlan: (learningPlan) => set({ learningPlan }),
  setCertifications: (certifications) => set({ certifications }),
  setBadges: (badges) => set({ badges }),
  setSavedDocs: (savedDocs) => set({ savedDocs }),
  setMetrics: (metrics) => set({ metrics }),

  addChatMessage: (msg) => {
    const newMessage: ChatMessage = {
      ...msg,
      id: `msg-${Date.now()}-${Math.random()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    set((state) => ({
      chatMessages: [...state.chatMessages, newMessage],
      isChatStreaming: msg.isStreaming || false,
    }));
  },

  appendStreamChunk: (chunk) => {
    set((state) => {
      const messages = [...state.chatMessages];
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && lastMsg.sender === 'tutor' && lastMsg.isStreaming) {
        lastMsg.text += chunk;
      }
      return { chatMessages: messages };
    });
  },

  finishStream: (retrievedMemoriesCount, searchSources, searchQueries) => {
    set((state) => {
      const messages = [...state.chatMessages];
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && lastMsg.sender === 'tutor') {
        lastMsg.isStreaming = false;
        if (typeof retrievedMemoriesCount === 'number') {
          lastMsg.retrievedMemoriesCount = retrievedMemoriesCount;
        }
        if (searchSources && searchSources.length > 0) {
          lastMsg.searchSources = searchSources;
        }
        if (searchQueries && searchQueries.length > 0) {
          lastMsg.searchQueries = searchQueries;
        }
      }
      return { chatMessages: messages, isChatStreaming: false };
    });
  },

  setStreamSources: (sources, queries) => {
    set((state) => {
      const messages = [...state.chatMessages];
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && lastMsg.sender === 'tutor') {
        lastMsg.searchSources = sources;
        lastMsg.searchQueries = queries;
      }
      return { chatMessages: messages };
    });
  },

  clearChat: () => set({
    chatMessages: [
      {
        id: `welcome-${Date.now()}`,
        sender: 'tutor',
        text: "Chat refreshed. Your verified skills & cognitive memory context are active. Ask me anything!",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ],
  }),

  setProctoringActive: (isProctoringActive) => set({ isProctoringActive }),
  addProctorFlag: (flag) => set((state) => ({ proctorFlags: [flag, ...state.proctorFlags.slice(0, 19)] })),
  updateProctorStatus: (identitySimilarity, faceCount) => set({ identitySimilarity, faceCount }),
  clearProctorFlags: () => set({ proctorFlags: [] }),
}));
