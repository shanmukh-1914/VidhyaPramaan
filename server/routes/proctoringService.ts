import { Router, Request, Response } from 'express';
import { ProctoringEngine } from '../proctoring.js';

export const proctoringPresenceRouter = Router();

// GET /health
proctoringPresenceRouter.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'SkillForge Proctoring Presence Service',
    endpoint: process.env.PROCTORING_PRESENCE_URL || 'internal_cv_presence_engine',
    timestamp: new Date().toISOString(),
  });
});

// POST /presence
proctoringPresenceRouter.post('/presence', async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      faceCount = 1, 
      detectedObjects = [], 
      currentFaceDescriptor, 
      enrolledFaceDescriptor, 
      headPoseAngles,
      frameBase64 
    } = req.body;

    // Check external microservice if configured
    const externalUrl = process.env.PROCTORING_PRESENCE_URL;
    if (externalUrl && !externalUrl.includes('localhost:8002')) {
      try {
        const response = await fetch(`${externalUrl.replace(/\/$/, '')}/presence`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(req.body),
        });
        if (response.ok) {
          const externalResult = await response.json();
          res.json({
            success: true,
            data: externalResult,
            message: 'Presence analyzed via external proctoring service.',
          });
          return;
        }
      } catch (microserviceErr: any) {
        console.warn('[Proctoring Microservice Notice] Falling back to internal engine:', microserviceErr.message);
      }
    }

    // Process via internal computer vision engine
    const analysis = ProctoringEngine.analyzeFrame(
      faceCount,
      detectedObjects,
      currentFaceDescriptor,
      enrolledFaceDescriptor,
      headPoseAngles
    );

    const facePresent = faceCount > 0;
    const hasViolations = analysis.flags.length > 0;
    const confidence = facePresent ? (faceCount === 1 ? 0.95 : 0.92) : 0.96;

    const responsePayload = {
      face_present: facePresent,
      face_count: faceCount,
      confidence,
      violation: hasViolations,
      violations: analysis.flags,
      identity_similarity: analysis.identitySimilarity,
      timestamp: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: responsePayload,
      message: hasViolations ? 'Presence analyzed with flags detected.' : 'Presence verified normal.',
    });
  } catch (err: any) {
    console.error('[Proctoring Presence Service Error]:', err);
    res.status(500).json({
      success: false,
      error: {
        code: 'PROCTORING_SERVICE_ERROR',
        message: err.message || 'Failed to analyze presence frame.',
      },
    });
  }
});
