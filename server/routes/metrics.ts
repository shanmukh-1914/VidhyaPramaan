import { Router, Response } from 'express';
import { VerifiedSkill, AssessmentRecord, Certification, Badge, LearnerMemory, LearningPlan } from '../db.js';
import { authenticateJWT, AuthenticatedRequest } from '../middleware.js';

export const metricsRouter = Router();

// GET /metrics/summary
metricsRouter.get('/summary', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    const [
      skills,
      assessments,
      certifications,
      badges,
      memories,
      learningPlan,
    ] = await Promise.all([
      VerifiedSkill.find({ userId }).lean(),
      AssessmentRecord.find({ userId }).lean(),
      Certification.find({ userId }).lean(),
      Badge.find({ userId }).lean(),
      LearnerMemory.find({ userId }).lean(),
      LearningPlan.findOne({ userId }).lean(),
    ]);

    const totalSkills = skills.length;
    const avgConfidence = totalSkills > 0
      ? Number((skills.reduce((sum, s) => sum + (s.confidenceScore || 0), 0) / totalSkills).toFixed(2))
      : 0;

    const totalAssessments = assessments.length;
    const passedAssessments = assessments.filter((a) => a.passed).length;
    const passRate = totalAssessments > 0
      ? Number(((passedAssessments / totalAssessments) * 100).toFixed(1))
      : 100;

    // Proctoring integrity compliance calculation: assessments with < 2 anomaly flags
    const cleanAssessments = assessments.filter((a) => (a.proctorFlags?.length || 0) < 2).length;
    const proctorComplianceRate = totalAssessments > 0
      ? Number(((cleanAssessments / totalAssessments) * 100).toFixed(1))
      : 100;

    // Category distribution
    const categoryMap = new Map<string, { count: number; avgScore: number; totalScore: number }>();
    for (const skill of skills) {
      const cat = skill.category || 'General';
      const existing = categoryMap.get(cat) || { count: 0, avgScore: 0, totalScore: 0 };
      existing.count += 1;
      existing.totalScore += skill.confidenceScore;
      existing.avgScore = Number((existing.totalScore / existing.count).toFixed(2));
      categoryMap.set(cat, existing);
    }

    const categoryDistribution = Array.from(categoryMap.entries()).map(([category, val]) => ({
      category,
      count: val.count,
      averageConfidence: Number((val.avgScore * 100).toFixed(0)),
    }));

    // Memory categories breakdown (strengths, weaknesses, concepts)
    const memoryStats = {
      total: memories.length,
      strengths: memories.filter((m) => m.category === 'strength').length,
      weaknesses: memories.filter((m) => m.category === 'weakness').length,
      conceptsMastered: memories.filter((m) => m.category === 'concept_mastered').length,
    };

    // Plan progress
    let planProgress = 0;
    if (learningPlan && learningPlan.modules && learningPlan.modules.length > 0) {
      const totalModules = learningPlan.modules.length;
      const completedModules = learningPlan.modules.filter((m: any) => m.completed).length;
      planProgress = Number(((completedModules / totalModules) * 100).toFixed(0));
    }

    res.json({
      summary: {
        totalVerifiedSkills: totalSkills,
        averageConfidence: Number((avgConfidence * 100).toFixed(0)),
        totalAssessmentsTaken: totalAssessments,
        assessmentPassRate: passRate,
        proctorComplianceRate,
        certificationsVerified: certifications.length,
        badgesEarned: badges.length,
        learnerMemoriesCount: memories.length,
        planProgressPercentage: planProgress,
      },
      categoryDistribution,
      memoryStats,
      recentSkills: skills.slice(0, 6).map((s) => ({
        name: s.skillName,
        category: s.category,
        score: Number((s.confidenceScore * 100).toFixed(0)),
        source: s.source,
        date: s.verifiedAt,
      })),
      recentAssessments: assessments.slice(0, 5).map((a) => ({
        id: a._id,
        skillName: a.skillName,
        score: a.score,
        passed: a.passed,
        proctorFlagsCount: a.proctorFlags?.length || 0,
        date: a.completedAt,
      })),
    });
  } catch (err: any) {
    console.error('[Metrics Summary Error]:', err);
    res.status(500).json({ error: `Failed to fetch metrics summary: ${err.message}` });
  }
});
