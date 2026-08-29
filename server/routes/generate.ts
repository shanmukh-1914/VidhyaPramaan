import { Router, Response } from 'express';
import { User, VerifiedSkill, Certification, AssessmentRecord, Badge, ResumeDoc } from '../db.js';
import { authenticateJWT, AuthenticatedRequest } from '../middleware.js';
import { generateGroundedDocument, transcribeAudio } from '../gemini.js';

export const generateRouter = Router();

// POST /generate/transcribe or /audio/transcribe (Audio transcription using gemini-3.5-transcribe)
generateRouter.post('/transcribe', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { audio, audioBase64, mimeType } = req.body;
    const rawAudio = audio || audioBase64;
    if (!rawAudio) {
      res.status(400).json({ error: 'Audio data (base64 string or data URI) is required.' });
      return;
    }

    // Strip data URL prefix if present
    const base64Data = rawAudio.includes('base64,') ? rawAudio.split('base64,')[1] : rawAudio;
    const resolvedMime = mimeType || (rawAudio.includes('data:') ? rawAudio.split(';')[0].replace('data:', '') : 'audio/webm');

    const transcription = await transcribeAudio(base64Data, resolvedMime);
    res.json({
      success: true,
      text: transcription.text,
      confidence: transcription.confidence ?? 0.98,
      model: 'gemini-3.5-transcribe',
    });
  } catch (err: any) {
    console.error('[Audio Transcription Route Error]:', err);
    res.status(500).json({ error: `Audio transcription failed: ${err.message}` });
  }
});

// POST /generate/resume (synthesizes strictly grounded technical resume)
generateRouter.post('/resume', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user?.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const verifiedSkills = await VerifiedSkill.find({ userId: user._id }).lean();
    const certifications = await Certification.find({ userId: user._id, verified: true }).lean();
    const assessments = await AssessmentRecord.find({ userId: user._id }).lean();
    const badges = await Badge.find({ userId: user._id }).lean();

    const docResult = await generateGroundedDocument(
      'resume',
      user.email,
      verifiedSkills.map((s) => ({
        skillName: s.skillName,
        category: s.category,
        confidenceScore: s.confidenceScore,
        source: s.source,
      })),
      certifications.map((c) => ({
        title: c.title,
        issuer: c.issuer,
        ocrConfidence: c.ocrConfidence,
      })),
      assessments.map((a) => ({
        skillName: a.skillName,
        score: a.score,
        passed: a.passed,
      })),
      badges.map((b) => ({
        title: b.title,
        category: b.category,
        rarity: b.rarity,
      }))
    );

    const savedDoc = await ResumeDoc.create({
      userId: user._id,
      docType: 'resume',
      content: docResult.content,
      verifiedSkillsIncluded: docResult.skillsIncluded,
      generatedAt: new Date(),
    });

    res.status(201).json({
      message: 'Verified resume generated successfully.',
      doc: savedDoc,
    });
  } catch (err: any) {
    console.error('[Resume Generation Error]:', err);
    res.status(500).json({ error: `Resume generation failed: ${err.message}` });
  }
});

// POST /generate/lor (synthesizes strictly grounded Letter of Recommendation)
generateRouter.post('/lor', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user?.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const verifiedSkills = await VerifiedSkill.find({ userId: user._id }).lean();
    const certifications = await Certification.find({ userId: user._id, verified: true }).lean();
    const assessments = await AssessmentRecord.find({ userId: user._id }).lean();
    const badges = await Badge.find({ userId: user._id }).lean();

    const docResult = await generateGroundedDocument(
      'lor',
      user.email,
      verifiedSkills.map((s) => ({
        skillName: s.skillName,
        category: s.category,
        confidenceScore: s.confidenceScore,
        source: s.source,
      })),
      certifications.map((c) => ({
        title: c.title,
        issuer: c.issuer,
        ocrConfidence: c.ocrConfidence,
      })),
      assessments.map((a) => ({
        skillName: a.skillName,
        score: a.score,
        passed: a.passed,
      })),
      badges.map((b) => ({
        title: b.title,
        category: b.category,
        rarity: b.rarity,
      }))
    );

    const savedDoc = await ResumeDoc.create({
      userId: user._id,
      docType: 'lor',
      content: docResult.content,
      verifiedSkillsIncluded: docResult.skillsIncluded,
      generatedAt: new Date(),
    });

    res.status(201).json({
      message: 'Verified Letter of Recommendation generated successfully.',
      doc: savedDoc,
    });
  } catch (err: any) {
    console.error('[LOR Generation Error]:', err);
    res.status(500).json({ error: `LOR generation failed: ${err.message}` });
  }
});

// POST /badge/issue (manually or rule-based badge issuing)
generateRouter.post('/issue', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { title, description, icon, category, rarity, criteria } = req.body;
    if (!title || !description) {
      res.status(400).json({ error: 'Title and description are required.' });
      return;
    }

    const badge = await Badge.create({
      userId: req.user?.userId,
      title,
      description,
      icon: icon || 'ShieldCheck',
      category: category || 'Special Distinction',
      rarity: rarity || 'gold',
      criteria: criteria || 'Verified through SkillForge multi-modal assessment.',
      issuedAt: new Date(),
    });

    res.status(201).json({ message: 'Badge issued successfully.', badge });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /badge/list
generateRouter.get('/badges', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const badges = await Badge.find({ userId: req.user?.userId }).sort({ issuedAt: -1 });
    res.json({ badges });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /generate/docs
generateRouter.get('/docs', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const docs = await ResumeDoc.find({ userId: req.user?.userId }).sort({ generatedAt: -1 });
    res.json({ docs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
