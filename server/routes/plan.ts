import { Router, Response } from 'express';
import { LearningPlan, VerifiedSkill, ModuleProgress } from '../db.js';
import { authenticateJWT, AuthenticatedRequest } from '../middleware.js';
import { generateLearningPlan } from '../gemini.js';

export const planRouter = Router();

// POST /plan/generate (generates curriculum based on real VerifiedSkill records)
planRouter.post('/generate', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { targetRole, targetLanguage } = req.body;
    if (!targetRole) {
      res.status(400).json({ error: 'targetRole is required.' });
      return;
    }

    const verifiedSkills = await VerifiedSkill.find({ userId: req.user?.userId }).lean();

    const planData = await generateLearningPlan(
      targetRole,
      targetLanguage || 'English',
      verifiedSkills.map((s) => ({
        skillName: s.skillName,
        category: s.category,
        confidenceScore: s.confidenceScore,
        source: s.source,
      }))
    );

    // Save or update active plan
    const newPlan = await LearningPlan.create({
      userId: req.user?.userId,
      targetRole: planData.targetRole || targetRole,
      targetLanguage: planData.targetLanguage || targetLanguage || 'English',
      estimatedWeeks: planData.estimatedWeeks || 4,
      modules: planData.modules || [],
    });

    res.status(201).json({
      message: 'Personalized learning plan generated successfully.',
      plan: newPlan,
    });
  } catch (err: any) {
    console.error('[Plan Generation Error]:', err);
    res.status(500).json({ error: `Plan generation failed: ${err.message}` });
  }
});

// GET /plan/current (returns active plan + progress)
planRouter.get('/current', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const plan = await LearningPlan.findOne({ userId: req.user?.userId }).sort({ createdAt: -1 });
    if (!plan) {
      res.json({ plan: null });
      return;
    }
    const progressList = await ModuleProgress.find({ userId: req.user?.userId, planId: plan._id });
    res.json({ plan, progressList });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /plan/toggle-lesson (mark lesson completed / in_progress)
planRouter.post('/toggle-lesson', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { planId, moduleId, lessonId, completed } = req.body;
    if (!planId || !moduleId || !lessonId) {
      res.status(400).json({ error: 'planId, moduleId, and lessonId are required.' });
      return;
    }

    const plan = await LearningPlan.findOne({ _id: planId, userId: req.user?.userId });
    if (!plan) {
      res.status(404).json({ error: 'Plan not found.' });
      return;
    }

    let progress = await ModuleProgress.findOne({
      userId: req.user?.userId,
      planId: plan._id,
      moduleId,
      lessonId,
    });

    if (!progress) {
      progress = await ModuleProgress.create({
        userId: req.user?.userId,
        planId: plan._id,
        moduleId,
        lessonId,
        status: completed ? 'completed' : 'in_progress',
        timeSpentMinutes: 15,
        lastAccessedAt: new Date(),
      });
    } else {
      progress.status = completed ? 'completed' : 'in_progress';
      progress.lastAccessedAt = new Date();
      await progress.save();
    }

    res.json({ message: 'Progress updated', progress });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
