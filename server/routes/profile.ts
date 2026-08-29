import { Router, Response } from 'express';
import { User, VerifiedSkill } from '../db.js';
import { authenticateJWT, AuthenticatedRequest } from '../middleware.js';
import { extractGitHubSkills } from '../github.js';

export const profileRouter = Router();

// POST /profile/github-username (attach username without verification flow)
profileRouter.post('/github-username', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { githubUsername } = req.body;
    if (typeof githubUsername !== 'string') {
      res.status(400).json({ error: 'Valid githubUsername string is required.' });
      return;
    }

    const cleanUsername = githubUsername.trim();
    const updatedUser = await User.findByIdAndUpdate(
      req.user?.userId,
      { githubUsername: cleanUsername },
      { new: true }
    ).select('-passwordHash');

    res.json({
      message: 'GitHub username attached successfully.',
      githubUsername: updatedUser?.githubUsername,
    });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to attach GitHub username: ${err.message}` });
  }
});

// POST /profile/verify-github (calls public GitHub REST API, computes weighted skill scores, saves VerifiedSkill records)
profileRouter.post('/verify-github', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user?.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const username = req.body.githubUsername?.trim() || user.githubUsername;
    if (!username) {
      res.status(400).json({ error: 'No GitHub username provided or associated with account.' });
      return;
    }

    // Save username if updated
    if (user.githubUsername !== username) {
      user.githubUsername = username;
      await user.save();
    }

    // Extract real features from GitHub public API
    const extracted = await extractGitHubSkills(username);

    // Save / update real VerifiedSkill documents in MongoDB
    const savedSkills = [];
    for (const skill of extracted.computedSkills) {
      const existing = await VerifiedSkill.findOne({
        userId: user._id,
        skillName: skill.skillName,
        source: 'github',
      });

      if (existing) {
        existing.confidenceScore = skill.confidenceScore;
        existing.evidenceDetails = skill.evidence;
        existing.verifiedAt = new Date();
        await existing.save();
        savedSkills.push(existing);
      } else {
        const created = await VerifiedSkill.create({
          userId: user._id,
          skillName: skill.skillName,
          category: skill.category,
          confidenceScore: skill.confidenceScore,
          source: 'github',
          evidenceDetails: skill.evidence,
          verifiedAt: new Date(),
        });
        savedSkills.push(created);
      }
    }

    res.json({
      message: 'GitHub profile analyzed and skills verified successfully.',
      profileData: extracted,
      verifiedSkills: savedSkills,
    });
  } catch (err: any) {
    console.error('[Verify GitHub Error]:', err);
    res.status(500).json({ error: err.message || 'GitHub verification failed.' });
  }
});

// POST /profile/enroll-face (stores face descriptor vector for proctoring verification)
profileRouter.post('/enroll-face', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { descriptor } = req.body;
    if (!Array.isArray(descriptor) || descriptor.length < 10) {
      res.status(400).json({ error: 'Invalid facial biometric descriptor array.' });
      return;
    }

    await User.findByIdAndUpdate(req.user?.userId, {
      enrolledFaceDescriptor: descriptor,
    });

    res.json({
      message: 'Facial identity reference enrolled successfully.',
      descriptorDimension: descriptor.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: `Face enrollment failed: ${err.message}` });
  }
});

// GET /profile/me
profileRouter.get('/me', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user?.userId).select('-passwordHash -refreshToken');
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /profile/verified-skills
profileRouter.get('/verified-skills', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const skills = await VerifiedSkill.find({ userId: req.user?.userId }).sort({ confidenceScore: -1 });
    res.json({ verifiedSkills: skills });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
