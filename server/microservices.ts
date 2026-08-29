import express from 'express';
import cors from 'cors';
import { skillScoringRouter } from './routes/skillScoring.js';
import { proctoringPresenceRouter } from './routes/proctoringService.js';
import { identityFaceRouter } from './routes/identityService.js';
import { ocrServiceRouter } from './routes/ocrService.js';

export function startStandaloneMicroservices() {
  // Service 1: Skill Scoring (Port 8001)
  const appScoring = express();
  appScoring.use(cors());
  appScoring.use(express.json({ limit: '50mb' }));
  appScoring.use('/', skillScoringRouter);
  try {
    const s1 = appScoring.listen(8001, '0.0.0.0', () => {
      console.log('[Microservice] Skill Scoring Service running on port 8001 (GET /health, POST /score)');
    });
    s1.on('error', (e: any) => {
      console.log('[Microservice] Skill Scoring port 8001 fallback: available on main router.');
    });
  } catch (err) {
    // Port might be taken or restricted, main server routes handle this
  }

  // Service 2: Proctoring Presence (Port 8002)
  const appProctoring = express();
  appProctoring.use(cors());
  appProctoring.use(express.json({ limit: '50mb' }));
  appProctoring.use('/', proctoringPresenceRouter);
  try {
    const s2 = appProctoring.listen(8002, '0.0.0.0', () => {
      console.log('[Microservice] Proctoring Presence Service running on port 8002 (GET /health, POST /presence)');
    });
    s2.on('error', (e: any) => {
      console.log('[Microservice] Proctoring Presence port 8002 fallback: available on main router.');
    });
  } catch (err) {
    // Handled
  }

  // Service 3: Identity Face Verification (Port 8003)
  const appIdentity = express();
  appIdentity.use(cors());
  appIdentity.use(express.json({ limit: '50mb' }));
  appIdentity.use('/', identityFaceRouter);
  try {
    const s3 = appIdentity.listen(8003, '0.0.0.0', () => {
      console.log('[Microservice] Face Identity Service running on port 8003 (GET /health, POST /verify)');
    });
    s3.on('error', (e: any) => {
      console.log('[Microservice] Face Identity port 8003 fallback: available on main router.');
    });
  } catch (err) {
    // Handled
  }

  // Service 4: Certificate OCR (Port 8004)
  const appOcr = express();
  appOcr.use(cors());
  appOcr.use(express.json({ limit: '50mb' }));
  appOcr.use('/', ocrServiceRouter);
  try {
    const s4 = appOcr.listen(8004, '0.0.0.0', () => {
      console.log('[Microservice] Certificate OCR Service running on port 8004 (GET /health, POST /ocr)');
    });
    s4.on('error', (e: any) => {
      console.log('[Microservice] Certificate OCR port 8004 fallback: available on main router.');
    });
  } catch (err) {
    // Handled
  }
}
