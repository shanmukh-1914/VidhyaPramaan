import { Router, Request, Response } from 'express';
import { processCertificateOCR } from '../ocr.js';

export const ocrServiceRouter = Router();

// GET /health
ocrServiceRouter.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'SkillForge Certificate OCR Service',
    endpoint: process.env.CERTIFICATE_OCR_URL || 'internal_gemini_multimodal_ocr_engine',
    timestamp: new Date().toISOString(),
  });
});

// POST /ocr
ocrServiceRouter.post('/ocr', async (req: Request, res: Response): Promise<void> => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Certificate imageBase64 string is required.',
        },
      });
      return;
    }

    // Check external microservice if configured
    const externalUrl = process.env.CERTIFICATE_OCR_URL;
    if (externalUrl && !externalUrl.includes('localhost:8004')) {
      try {
        const response = await fetch(`${externalUrl.replace(/\/$/, '')}/ocr`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(req.body),
        });
        if (response.ok) {
          const externalResult = await response.json();
          res.json({
            success: true,
            data: externalResult,
            message: 'Certificate extracted via external OCR microservice.',
          });
          return;
        }
      } catch (microserviceErr: any) {
        console.warn('[OCR Microservice Notice] Falling back to internal engine:', microserviceErr.message);
      }
    }

    // Process via internal OCR engine
    const ocrResult = await processCertificateOCR(imageBase64, mimeType);

    res.json({
      success: true,
      data: {
        candidate_name: ocrResult.candidateName || 'Candidate',
        certificate_name: ocrResult.title,
        issuing_organization: ocrResult.issuer,
        issue_date: ocrResult.issuedDate || 'Verified Recent',
        credential_id: ocrResult.credentialId || 'SF-VERIFIED',
        skills: ocrResult.skillsIdentified,
        raw_ocr_text: ocrResult.extractedText,
        confidence: ocrResult.ocrConfidence,
        verified: ocrResult.verified,
      },
      message: 'Certificate OCR extraction completed successfully.',
    });
  } catch (err: any) {
    console.error('[OCR Service Error]:', err);
    res.status(500).json({
      success: false,
      error: {
        code: 'OCR_SERVICE_ERROR',
        message: err.message || 'Failed to process certificate OCR.',
      },
    });
  }
});
