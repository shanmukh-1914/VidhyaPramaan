import { Router, Response } from 'express';
import { Certification, VerifiedSkill } from '../db.js';
import { authenticateJWT, AuthenticatedRequest } from '../middleware.js';
import { processCertificateOCR } from '../ocr.js';

export const credentialRouter = Router();

// POST /credential/verify (runs OCR on uploaded certificate image, extracts data + honest confidence score, saves to DB)
credentialRouter.post('/verify', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) {
      res.status(400).json({ error: 'Certificate image (base64) is required for OCR verification.' });
      return;
    }

    // Process through OCR engine
    const ocrResult = await processCertificateOCR(imageBase64, mimeType || 'image/jpeg');

    // Create Certification record in MongoDB
    const certification = await Certification.create({
      userId: req.user?.userId,
      title: ocrResult.title,
      issuer: ocrResult.issuer,
      issuedDate: ocrResult.issuedDate,
      credentialId: ocrResult.credentialId,
      ocrExtractedText: ocrResult.extractedText,
      ocrConfidence: ocrResult.ocrConfidence,
      verified: ocrResult.verified,
    });

    // Add verified skills derived from certificate
    const addedSkills = [];
    for (const skill of ocrResult.skillsIdentified) {
      const existing = await VerifiedSkill.findOne({
        userId: req.user?.userId,
        skillName: skill,
        source: 'certification',
      });

      if (!existing) {
        const newSkill = await VerifiedSkill.create({
          userId: req.user?.userId,
          skillName: skill,
          category: 'Accredited Credential',
          confidenceScore: Number(Math.min(0.95, Math.max(0.70, ocrResult.ocrConfidence)).toFixed(2)),
          source: 'certification',
          evidenceDetails: {
            certificateTitle: ocrResult.title,
            issuer: ocrResult.issuer,
            credentialId: ocrResult.credentialId,
            ocrConfidence: ocrResult.ocrConfidence,
          },
          verifiedAt: new Date(),
        });
        addedSkills.push(newSkill);
      }
    }

    res.status(201).json({
      message: 'Certificate processed and verified successfully.',
      certification,
      addedSkills,
      ocrResult,
    });
  } catch (err: any) {
    console.error('[Credential Verification Error]:', err);
    res.status(500).json({ error: `Certificate verification failed: ${err.message}` });
  }
});

// GET /credential/list
credentialRouter.get('/list', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const certs = await Certification.find({ userId: req.user?.userId }).sort({ createdAt: -1 });
    res.json({ certifications: certs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
