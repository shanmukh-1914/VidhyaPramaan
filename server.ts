import express, { Request, Response } from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

// Load environment variables
dotenv.config();

import { connectDatabase, ATLAS_VECTOR_SEARCH_INDEX_JSON, vectorSearchPath, isConnectedToDb } from './server/db.js';
import { authRouter } from './server/routes/auth.js';
import { profileRouter } from './server/routes/profile.js';
import { credentialRouter } from './server/routes/credential.js';
import { planRouter } from './server/routes/plan.js';
import { assessmentRouter } from './server/routes/assessment.js';
import { generateRouter } from './server/routes/generate.js';
import { metricsRouter } from './server/routes/metrics.js';
import { skillScoringRouter } from './server/routes/skillScoring.js';
import { proctoringPresenceRouter } from './server/routes/proctoringService.js';
import { identityFaceRouter } from './server/routes/identityService.js';
import { ocrServiceRouter } from './server/routes/ocrService.js';
import { adminRouter } from './server/routes/admin.js';
import { setupSocketIO } from './server/sockets.js';
import { startStandaloneMicroservices } from './server/microservices.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  // Setup Socket.IO
  const io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    maxHttpBufferSize: 1e8, // 100MB buffer
  });

  setupSocketIO(io);

  // Express Middlewares
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Connect to Database
  await connectDatabase();

  // Start internal microservices on ports 8001, 8002, 8003, 8004
  startStandaloneMicroservices();

  // Health and System Diagnostics Endpoint
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      service: 'SkillForge AI Platform',
      database: isConnectedToDb ? 'connected (MongoDB Atlas)' : 'connecting',
      vectorEngine: vectorSearchPath,
      vectorIndexConfig: ATLAS_VECTOR_SEARCH_INDEX_JSON,
      timestamp: new Date().toISOString(),
    });
  });

  // Mount API Routers (supporting both /auth and /api/auth paths)
  app.use('/auth', authRouter);
  app.use('/api/auth', authRouter);

  app.use('/profile', profileRouter);
  app.use('/api/profile', profileRouter);

  app.use('/credential', credentialRouter);
  app.use('/api/credential', credentialRouter);

  app.use('/plan', planRouter);
  app.use('/api/plan', planRouter);

  app.use('/assessment', assessmentRouter);
  app.use('/api/assessment', assessmentRouter);

  app.use('/generate', generateRouter);
  app.use('/api/generate', generateRouter);
  app.use('/audio', generateRouter);
  app.use('/api/audio', generateRouter);
  app.use('/transcribe', generateRouter);
  app.use('/api/transcribe', generateRouter);
  app.use('/badge', generateRouter);
  app.use('/api/badge', generateRouter);

  app.use('/metrics', metricsRouter);
  app.use('/api/metrics', metricsRouter);

  // Microservices & Administration Endpoints (Phases 5, 8, 9, 10, 11, 24)
  app.use('/scoring', skillScoringRouter);
  app.use('/api/scoring', skillScoringRouter);
  app.use('/score', skillScoringRouter);
  app.use('/api/score', skillScoringRouter);

  app.use('/proctoring', proctoringPresenceRouter);
  app.use('/api/proctoring', proctoringPresenceRouter);
  app.use('/presence', proctoringPresenceRouter);
  app.use('/api/presence', proctoringPresenceRouter);

  app.use('/identity', identityFaceRouter);
  app.use('/api/identity', identityFaceRouter);
  app.use('/verify', identityFaceRouter);
  app.use('/api/verify', identityFaceRouter);

  app.use('/ocr', ocrServiceRouter);
  app.use('/api/ocr', ocrServiceRouter);

  app.use('/admin', adminRouter);
  app.use('/api/admin', adminRouter);

  // Frontend Serving (Vite dev middleware in development, static in production)
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[SkillForge AI] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[SkillForge AI] Fatal startup error:', err);
});
