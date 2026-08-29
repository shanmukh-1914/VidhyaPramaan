import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User, LearnerMemory, VerifiedSkill, InProcessVectorEngine } from './db.js';
import { streamTutoringChat, summarizeTurnMemory, generateEmbedding } from './gemini.js';
import { ProctoringEngine, ProctorFlagEvent } from './proctoring.js';

const JWT_SECRET = process.env.JWT_SECRET || 'skillforge-super-secret-jwt-key-2025';

interface AuthenticatedSocket extends Socket {
  user?: {
    userId: string;
    email: string;
  };
}

export function setupSocketIO(io: SocketIOServer) {
  // Authentication middleware for Socket.IO
  const authMiddleware = (socket: AuthenticatedSocket, next: (err?: Error) => void) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) {
      return next(new Error('Authentication token missing'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Invalid authentication token'));
    }
  };

  // ═══════════════════════════════════════════════════════════
  // 1. /tutoring Namespace
  // ═══════════════════════════════════════════════════════════
  const tutorNamespace = io.of('/tutoring');
  tutorNamespace.use(authMiddleware as any);

  tutorNamespace.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.user?.userId;
    console.log(`[Socket:Tutoring] User connected: ${userId}`);

    socket.on('tutor:message', async (data: { message: string; targetLanguage?: string; useSearchGrounding?: boolean }) => {
      try {
        if (!userId) {
          socket.emit('tutor:error', { error: 'Unauthorized user.' });
          return;
        }

        const userMessage = data.message;
        const targetLanguage = data.targetLanguage || 'English';
        const useSearchGrounding = data.useSearchGrounding !== false;

        // 1. Generate embedding of the user's query for RAG retrieval
        const queryEmbedding = await generateEmbedding(userMessage);

        // 2. Vector Search top-5 LearnerMemory items
        const topMemories = await InProcessVectorEngine.searchTopK(userId, queryEmbedding, 5);

        // 3. Retrieve verified skills for user context
        const verifiedSkills = await VerifiedSkill.find({ userId }).lean();

        // 4. Stream response token-by-token with live Search Grounding support
        const result = await streamTutoringChat(
          userMessage,
          targetLanguage,
          topMemories,
          verifiedSkills.map((s) => ({ skillName: s.skillName, confidenceScore: s.confidenceScore })),
          (chunk: string) => {
            socket.emit('tutor:chunk', { chunk });
          },
          {
            useSearchGrounding,
            onSearchSources: (sources, queries) => {
              if (sources.length > 0 || queries.length > 0) {
                socket.emit('tutor:sources', { sources, queries });
              }
            },
          }
        );

        socket.emit('tutor:done', {
          fullResponse: result.fullResponse,
          searchSources: result.searchSources,
          retrievedMemoriesCount: topMemories.length,
        });

        // 5. Asynchronously summarize turn into new LearnerMemory and persist to MongoDB
        try {
          const memory = await summarizeTurnMemory(userMessage, result.fullResponse);
          const memoryEmbedding = await generateEmbedding(memory.text);

          await LearnerMemory.create({
            userId,
            text: memory.text,
            category: memory.category,
            embedding: memoryEmbedding,
            createdAt: new Date(),
          });
          console.log(`[Socket:Tutoring] Saved new LearnerMemory: [${memory.category}] ${memory.text}`);
        } catch (memErr) {
          console.warn('[Socket:Tutoring] Memory persistence skipped:', memErr);
        }
      } catch (err: any) {
        console.error('[Socket:Tutoring Error]:', err);
        socket.emit('tutor:error', { error: err.message || 'Tutoring stream error.' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket:Tutoring] User disconnected: ${userId}`);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 2. /proctoring Namespace
  // ═══════════════════════════════════════════════════════════
  const proctorNamespace = io.of('/proctoring');
  proctorNamespace.use(authMiddleware as any);

  proctorNamespace.on('connection', async (socket: AuthenticatedSocket) => {
    const userId = socket.user?.userId;
    console.log(`[Socket:Proctoring] Session connected: ${userId}`);

    // Load enrolled facial descriptor from DB if available
    let enrolledFaceDescriptor: number[] = [];
    try {
      const user = await User.findById(userId);
      if (user?.enrolledFaceDescriptor && user.enrolledFaceDescriptor.length > 0) {
        enrolledFaceDescriptor = user.enrolledFaceDescriptor;
      }
    } catch (e) {
      console.warn('[Socket:Proctoring] Could not load user face enrollment:', e);
    }

    socket.on('proctor:frame', (payload: {
      faceCount: number;
      detectedObjects?: string[];
      currentFaceDescriptor?: number[];
      headPoseAngles?: { pitch: number; yaw: number; roll: number };
      timestamp?: string;
    }) => {
      try {
        const { faceCount, detectedObjects = [], currentFaceDescriptor, headPoseAngles } = payload;

        // Run analysis on metadata (NEVER saving the frame image)
        const analysis = ProctoringEngine.analyzeFrame(
          faceCount,
          detectedObjects,
          currentFaceDescriptor,
          enrolledFaceDescriptor,
          headPoseAngles
        );

        // Emit back status and any real flags
        socket.emit('proctor:status', {
          healthy: analysis.flags.length === 0,
          identitySimilarity: analysis.identitySimilarity,
          activeFaceCount: faceCount,
          timestamp: new Date().toISOString(),
        });

        if (analysis.flags.length > 0) {
          for (const flag of analysis.flags) {
            socket.emit('proctor:flag', {
              type: flag.type,
              confidence: flag.confidence,
              details: flag.details,
              timestamp: flag.timestamp.toISOString(),
            });
          }
        }
      } catch (err: any) {
        console.error('[Socket:Proctoring Frame Error]:', err);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket:Proctoring] Session disconnected: ${userId}`);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 3. /assessment Namespace
  // ═══════════════════════════════════════════════════════════
  const assessmentNamespace = io.of('/assessment');
  assessmentNamespace.use(authMiddleware as any);

  assessmentNamespace.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.user?.userId;
    console.log(`[Socket:Assessment] User connected: ${userId}`);

    socket.on('assessment:start', (data: { assessmentId: string; timeLimitMinutes: number }) => {
      socket.emit('assessment:started', {
        startTime: new Date().toISOString(),
        timeLimitMinutes: data.timeLimitMinutes || 10,
      });
    });

    socket.on('assessment:progress', (data: { currentQuestionIndex: number; answeredCount: number; totalCount: number }) => {
      socket.emit('assessment:progress_ack', {
        ...data,
        updatedAt: new Date().toISOString(),
      });
    });

    socket.on('disconnect', () => {
      console.log(`[Socket:Assessment] User disconnected: ${userId}`);
    });
  });
}
