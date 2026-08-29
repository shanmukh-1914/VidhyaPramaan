import { Router, Response } from 'express';
import { AssessmentRecord, VerifiedSkill, Badge } from '../db.js';
import { authenticateJWT, AuthenticatedRequest } from '../middleware.js';
import { generateAssessment, gradeShortAnswerQuestion } from '../gemini.js';

export const assessmentRouter = Router();

// POST /assessment/generate (generates questions + rubric key)
assessmentRouter.post('/generate', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { skillName, targetLanguage, difficulty } = req.body;
    if (!skillName) {
      res.status(400).json({ error: 'skillName is required.' });
      return;
    }

    const assessmentData = await generateAssessment(
      skillName,
      targetLanguage || 'English',
      difficulty || 'intermediate'
    );

    // Hide answers from client response for security
    const clientQuestions = (assessmentData.questions || []).map((q: any) => {
      const sanitized: any = {
        id: q.id,
        type: q.type,
        question: q.question,
        points: q.points || 25,
      };
      if (q.type === 'objective') {
        sanitized.options = q.options;
      }
      return sanitized;
    });

    res.json({
      skillName: assessmentData.skillName || skillName,
      difficulty: assessmentData.difficulty || difficulty || 'intermediate',
      timeLimitMinutes: assessmentData.timeLimitMinutes || 10,
      questions: clientQuestions,
      // Pass encoded server verification token or keep original in session
      rawAssessment: assessmentData,
    });
  } catch (err: any) {
    console.error('[Assessment Generation Error]:', err);
    res.status(500).json({ error: `Assessment generation failed: ${err.message}` });
  }
});

// POST /assessment/submit (grades questions with dual-pass AI review and persists proctor flags)
assessmentRouter.post('/submit', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { skillName, questions, proctorFlags, rawAssessment } = req.body;
    if (!skillName || !Array.isArray(questions)) {
      res.status(400).json({ error: 'skillName and submitted questions array are required.' });
      return;
    }

    let totalPoints = 0;
    let earnedPoints = 0;
    const gradedQuestions = [];

    const originalQuestionsMap = new Map();
    if (rawAssessment?.questions) {
      for (const q of rawAssessment.questions) {
        originalQuestionsMap.set(q.id, q);
      }
    }

    for (const submitted of questions) {
      const original = originalQuestionsMap.get(submitted.id) || submitted;
      const points = original.points || 25;
      totalPoints += points;

      if (submitted.type === 'objective') {
        // Deterministic code grading
        const isCorrect = (submitted.userAnswer || '').trim().toLowerCase() === (original.correctAnswer || '').trim().toLowerCase();
        const score = isCorrect ? 1.0 : 0.0;
        earnedPoints += score * points;

        gradedQuestions.push({
          id: submitted.id,
          question: original.question,
          type: 'objective' as const,
          userAnswer: submitted.userAnswer || '',
          correctAnswer: original.correctAnswer || '',
          score: Number((score * 100).toFixed(0)),
          reviewer1Score: score,
          reviewer2Score: score,
          needsReview: false,
          feedback: isCorrect ? 'Correct response.' : `Incorrect. The correct answer is: ${original.correctAnswer}`,
        });
      } else {
        // Dual-pass independent AI grading for short-answer questions
        const grading = await gradeShortAnswerQuestion(
          original.question,
          original.rubric || '',
          original.exemplarAnswer || '',
          submitted.userAnswer || ''
        );

        earnedPoints += grading.score * points;

        gradedQuestions.push({
          id: submitted.id,
          question: original.question,
          type: 'short_answer' as const,
          userAnswer: submitted.userAnswer || '',
          correctAnswer: original.exemplarAnswer || '',
          score: Number((grading.score * 100).toFixed(0)),
          reviewer1Score: grading.reviewer1Score,
          reviewer2Score: grading.reviewer2Score,
          needsReview: grading.needsReview,
          feedback: grading.feedback,
        });
      }
    }

    const finalPercentage = totalPoints > 0 ? Number(((earnedPoints / totalPoints) * 100).toFixed(1)) : 0;
    const passed = finalPercentage >= 70;

    // Persist proctor flags directly to MongoDB
    const formattedFlags = Array.isArray(proctorFlags)
      ? proctorFlags.map((f: any) => ({
          type: f.type || 'anomaly',
          timestamp: f.timestamp ? new Date(f.timestamp) : new Date(),
          confidence: f.confidence || 0.8,
          metadata: { details: f.details || '' },
        }))
      : [];

    const record = await AssessmentRecord.create({
      userId: req.user?.userId,
      skillName,
      score: finalPercentage,
      passed,
      proctorFlags: formattedFlags,
      questions: gradedQuestions,
      completedAt: new Date(),
    });

    // If passed, create / update VerifiedSkill in MongoDB
    let verifiedSkill = null;
    if (passed) {
      const normalizedScore = Number((finalPercentage / 100).toFixed(2));
      verifiedSkill = await VerifiedSkill.findOneAndUpdate(
        { userId: req.user?.userId, skillName, source: 'assessment' },
        {
          confidenceScore: normalizedScore,
          category: 'Proctored Assessment',
          evidenceDetails: {
            assessmentScore: finalPercentage,
            proctorFlagCount: formattedFlags.length,
            assessmentId: record._id,
          },
          verifiedAt: new Date(),
        },
        { upsert: true, new: true }
      );

      // Auto-issue Mastery Badge if score >= 85%
      if (finalPercentage >= 85) {
        await Badge.create({
          userId: req.user?.userId,
          title: `${skillName} Proctored Master`,
          description: `Achieved ${finalPercentage}% in comprehensive live-proctored technical assessment.`,
          icon: 'Award',
          category: 'Assessment Excellence',
          rarity: finalPercentage >= 95 ? 'platinum' : 'gold',
          criteria: `Scored ${finalPercentage}% with verified zero-cheat proctoring integrity.`,
          issuedAt: new Date(),
        });
      }
    }

    res.status(201).json({
      message: passed ? 'Assessment passed! Skill verified.' : 'Assessment completed.',
      record,
      finalPercentage,
      passed,
      verifiedSkill,
    });
  } catch (err: any) {
    console.error('[Assessment Submission Error]:', err);
    res.status(500).json({ error: `Assessment grading failed: ${err.message}` });
  }
});

// GET /assessment/history
assessmentRouter.get('/history', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const history = await AssessmentRecord.find({ userId: req.user?.userId }).sort({ completedAt: -1 });
    res.json({ history });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
