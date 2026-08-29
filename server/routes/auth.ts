import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User, VerifiedSkill, IUser, AuditLog } from '../db.js';
import { generateToken, generateRefreshToken, verifyRefreshToken, authenticateJWT, AuthenticatedRequest } from '../middleware.js';
import { extractGitHubSkills, GitHubExtractedFeatures } from '../github.js';

export const authRouter = Router();

/**
 * Helper to auto-fetch public GitHub profile details & save verified skills
 */
async function autoFetchAndSaveGitHubSkills(
  user: any,
  providedUsername?: string
): Promise<{ profileData: GitHubExtractedFeatures | null; verifiedSkills: any[] }> {
  const username = (providedUsername || user.githubUsername || '').trim();
  if (!username) {
    return { profileData: null, verifiedSkills: [] };
  }

  // Update user's githubUsername if newly provided
  if (providedUsername && user.githubUsername !== username) {
    user.githubUsername = username;
    await user.save();
  }

  try {
    const extracted = await extractGitHubSkills(username);
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

    return { profileData: extracted, verifiedSkills: savedSkills };
  } catch (err: any) {
    console.warn(`[Auto-Fetch GitHub Skills] Non-blocking notice for @${username}:`, err.message);
    return { profileData: null, verifiedSkills: [] };
  }
}

// POST /auth/signup & POST /auth/register
authRouter.post(['/signup', '/register'], async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, githubUsername } = req.body;
    if (!email || !password || password.length < 6) {
      res.status(400).json({ error: 'Valid email and a password of at least 6 characters are required.' });
      return;
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      res.status(409).json({ error: 'An account with this email address already exists.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      authProvider: 'local',
      githubUsername: (githubUsername || '').trim(),
    });

    // Auto-fetch GitHub details upon signup if username was provided
    let githubResult = { profileData: null as any, verifiedSkills: [] as any[] };
    if (newUser.githubUsername) {
      githubResult = await autoFetchAndSaveGitHubSkills(newUser, newUser.githubUsername);
    }

    const token = generateToken({
      userId: (newUser._id as any).toString(),
      email: newUser.email,
      role: newUser.role || 'candidate',
      tenantId: newUser.tenantId || 'default_tenant',
    });

    const refreshToken = generateRefreshToken({
      userId: (newUser._id as any).toString(),
      email: newUser.email,
      role: newUser.role || 'candidate',
      tenantId: newUser.tenantId || 'default_tenant',
    });

    newUser.refreshToken = refreshToken;
    await newUser.save();

    res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      token,
      refreshToken,
      user: {
        id: newUser._id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        tenantId: newUser.tenantId,
        organizationName: newUser.organizationName,
        githubUsername: newUser.githubUsername,
        authProvider: newUser.authProvider,
        createdAt: newUser.createdAt,
      },
      githubProfile: githubResult.profileData,
      verifiedSkills: githubResult.verifiedSkills,
    });
  } catch (err: any) {
    console.error('[Auth Signup Error]:', err);
    res.status(500).json({
      success: false,
      error: { code: 'REGISTRATION_ERROR', message: `Registration failed: ${err.message}` },
    });
  }
});

// POST /auth/login
authRouter.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, githubUsername } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    if (user.passwordHash) {
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        res.status(401).json({ error: 'Invalid email or password.' });
        return;
      }
    }

    // If a GitHub username was entered during login, attach it to the user
    if (githubUsername && githubUsername.trim()) {
      user.githubUsername = githubUsername.trim();
      await user.save();
    }

    // Auto-fetch & synchronize GitHub details upon login
    let githubResult = { profileData: null as any, verifiedSkills: [] as any[] };
    if (user.githubUsername) {
      githubResult = await autoFetchAndSaveGitHubSkills(user, user.githubUsername);
    }

    const token = generateToken({
      userId: (user._id as any).toString(),
      email: user.email,
      role: user.role || 'candidate',
      tenantId: user.tenantId || 'default_tenant',
    });

    const refreshToken = generateRefreshToken({
      userId: (user._id as any).toString(),
      email: user.email,
      role: user.role || 'candidate',
      tenantId: user.tenantId || 'default_tenant',
    });

    user.refreshToken = refreshToken;
    await user.save();

    // Log audit event
    await AuditLog.create({
      userId: user._id,
      tenantId: user.tenantId || 'default_tenant',
      action: 'USER_LOGIN',
      resource: 'auth',
      details: { authProvider: user.authProvider || 'local' },
      ipAddress: req.ip || '',
    }).catch(() => {});

    res.json({
      success: true,
      message: 'Login successful.',
      token,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
        organizationName: user.organizationName,
        githubUsername: user.githubUsername,
        authProvider: user.authProvider,
        hasEnrolledFace: (user.enrolledFaceDescriptor?.length || 0) > 0,
        createdAt: user.createdAt,
      },
      githubProfile: githubResult.profileData,
      verifiedSkills: githubResult.verifiedSkills,
    });
  } catch (err: any) {
    console.error('[Auth Login Error]:', err);
    res.status(500).json({
      success: false,
      error: { code: 'AUTH_ERROR', message: `Authentication failed: ${err.message}` },
    });
  }
});

// POST /auth/gmail & /api/auth/gmail (Direct Gmail Authentication with optional GitHub handle)
authRouter.post('/gmail', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, name, avatarUrl, githubUsername } = req.body;
    if (!email || !email.includes('@')) {
      res.status(400).json({ error: 'A valid Gmail address is required for authentication.' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find or create user
    let user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      user = await User.create({
        email: normalizedEmail,
        authProvider: 'gmail',
        name: name || normalizedEmail.split('@')[0],
        avatarUrl: avatarUrl || '',
        githubUsername: (githubUsername || '').trim(),
      });
    } else {
      user.authProvider = user.authProvider || 'gmail';
      if (name && !user.name) user.name = name;
      if (avatarUrl && !user.avatarUrl) user.avatarUrl = avatarUrl;
      if (githubUsername && githubUsername.trim()) user.githubUsername = githubUsername.trim();
      await user.save();
    }

    // Auto-fetch GitHub details upon Gmail login
    let githubResult = { profileData: null as any, verifiedSkills: [] as any[] };
    if (user.githubUsername) {
      githubResult = await autoFetchAndSaveGitHubSkills(user, user.githubUsername);
    }

    const token = generateToken({
      userId: (user._id as any).toString(),
      email: user.email,
      role: user.role || 'candidate',
      tenantId: user.tenantId || 'default_tenant',
    });

    const refreshToken = generateRefreshToken({
      userId: (user._id as any).toString(),
      email: user.email,
      role: user.role || 'candidate',
      tenantId: user.tenantId || 'default_tenant',
    });

    user.refreshToken = refreshToken;
    await user.save();

    res.json({
      success: true,
      message: 'Gmail authentication successful.',
      token,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
        organizationName: user.organizationName,
        avatarUrl: user.avatarUrl,
        githubUsername: user.githubUsername,
        authProvider: user.authProvider,
        hasEnrolledFace: (user.enrolledFaceDescriptor?.length || 0) > 0,
        createdAt: user.createdAt,
      },
      githubProfile: githubResult.profileData,
      verifiedSkills: githubResult.verifiedSkills,
    });
  } catch (err: any) {
    console.error('[Gmail Auth Error]:', err);
    res.status(500).json({ error: `Gmail authentication failed: ${err.message}` });
  }
});

// GET /auth/google/url (Google OAuth popup URL generator)
authRouter.get('/google/url', (req: Request, res: Response): void => {
  const host = req.get('host') || 'localhost:3000';
  const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
  const baseUrl = process.env.APP_URL || `${protocol}://${host}`;
  const redirectUri = `${baseUrl}/auth/callback`;

  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.CLIENT_ID;

  if (!clientId) {
    // Provide a direct mockable/demo Google auth URL redirect for instant local preview
    res.json({
      url: `/auth/mock-google-signin?redirect_uri=${encodeURIComponent(redirectUri)}`,
      isConfigured: false,
      redirectUri,
    });
    return;
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  res.json({
    url: authUrl,
    isConfigured: true,
    redirectUri,
  });
});

// GET /auth/callback & /auth/callback/ (OAuth Callback Handler with postMessage)
export async function handleOAuthCallback(req: Request, res: Response): Promise<void> {
  try {
    const { code, state } = req.query;
    let userEmail = 'learner.google@gmail.com';
    let userName = 'Google Learner';
    let userAvatar = '';

    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.CLIENT_SECRET;

    if (code && clientId && clientSecret) {
      try {
        const host = req.get('host') || 'localhost:3000';
        const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
        const baseUrl = process.env.APP_URL || `${protocol}://${host}`;
        const redirectUri = `${baseUrl}/auth/callback`;

        // Exchange code with Google
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code: code as string,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
          }),
        });

        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
          });
          if (userinfoRes.ok) {
            const profile = await userinfoRes.json();
            userEmail = profile.email || userEmail;
            userName = profile.name || userName;
            userAvatar = profile.picture || userAvatar;
          }
        }
      } catch (tokenErr) {
        console.warn('[Google OAuth Token Exchange Notice]:', tokenErr);
      }
    }

    // Upsert User in MongoDB
    let user = await User.findOne({ email: userEmail.toLowerCase() });
    if (!user) {
      user = await User.create({
        email: userEmail.toLowerCase(),
        authProvider: 'google',
        name: userName,
        avatarUrl: userAvatar,
        githubUsername: '',
      });
    }

    // Auto-fetch GitHub details if attached
    let githubResult = { profileData: null as any, verifiedSkills: [] as any[] };
    if (user.githubUsername) {
      githubResult = await autoFetchAndSaveGitHubSkills(user, user.githubUsername);
    }

    const token = generateToken({ userId: (user._id as any).toString(), email: user.email });

    const payload = JSON.stringify({
      type: 'OAUTH_AUTH_SUCCESS',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        githubUsername: user.githubUsername,
        authProvider: user.authProvider,
        createdAt: user.createdAt,
      },
      githubProfile: githubResult.profileData,
      verifiedSkills: githubResult.verifiedSkills,
    });

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>SkillForge Authentication</title>
          <style>
            body { background: #020617; color: #f8fafc; font-family: ui-sans-serif, system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: #0f172a; padding: 2rem; border-radius: 1rem; border: 1px solid #1e293b; text-align: center; max-width: 400px; }
            .spinner { width: 32px; height: 32px; border: 3px solid #6366f1; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite; margin: 1rem auto; }
            @keyframes spin { to { transform: rotate(360deg); } }
          </style>
        </head>
        <body>
          <div class="card">
            <h3>Google Authentication Successful</h3>
            <div class="spinner"></div>
            <p style="font-size: 13px; color: #94a3b8;">Finalizing your secure session and synchronizing GitHub ledger...</p>
          </div>
          <script>
            try {
              if (window.opener) {
                window.opener.postMessage(${payload}, '*');
                setTimeout(() => window.close(), 600);
              } else {
                window.location.href = '/';
              }
            } catch (e) {
              window.location.href = '/';
            }
          </script>
        </body>
      </html>
    `);
  } catch (err: any) {
    res.status(500).send(`Authentication error: ${err.message}`);
  }
};

authRouter.get('/callback', handleOAuthCallback);
authRouter.get('/callback/', handleOAuthCallback);

// GET /auth/me
authRouter.get('/me', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user?.userId).select('-passwordHash');
    if (!user) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User profile not found.' } });
      return;
    }
    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
        organizationName: user.organizationName,
        bio: user.bio,
        title: user.title,
        avatarUrl: user.avatarUrl,
        githubUsername: user.githubUsername,
        authProvider: user.authProvider,
        hasEnrolledFace: (user.enrolledFaceDescriptor?.length || 0) > 0,
        createdAt: user.createdAt,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// POST /auth/refresh
authRouter.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ success: false, error: { code: 'MISSING_TOKEN', message: 'Refresh token is required.' } });
      return;
    }

    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      res.status(401).json({ success: false, error: { code: 'INVALID_REFRESH_TOKEN', message: 'Invalid or expired refresh token.' } });
      return;
    }

    const user = await User.findById(decoded.userId);
    if (!user || user.refreshToken !== refreshToken) {
      res.status(401).json({ success: false, error: { code: 'INVALID_REFRESH_TOKEN', message: 'Refresh token revoked or expired.' } });
      return;
    }

    const newToken = generateToken({
      userId: (user._id as any).toString(),
      email: user.email,
      role: user.role || 'candidate',
      tenantId: user.tenantId || 'default_tenant',
    });

    const newRefreshToken = generateRefreshToken({
      userId: (user._id as any).toString(),
      email: user.email,
      role: user.role || 'candidate',
      tenantId: user.tenantId || 'default_tenant',
    });

    user.refreshToken = newRefreshToken;
    await user.save();

    res.json({
      success: true,
      token: newToken,
      refreshToken: newRefreshToken,
      message: 'Token refreshed successfully.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'REFRESH_ERROR', message: err.message } });
  }
});

// POST /auth/logout
authRouter.post('/logout', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.userId) {
      await User.findByIdAndUpdate(req.user.userId, { refreshToken: '' });
      await AuditLog.create({
        userId: req.user.userId,
        tenantId: req.user.tenantId || 'default_tenant',
        action: 'USER_LOGOUT',
        resource: 'auth',
        ipAddress: req.ip || '',
      }).catch(() => {});
    }
    res.json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'LOGOUT_ERROR', message: err.message } });
  }
});

// POST /auth/profile/update
authRouter.post('/profile/update', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, bio, title, organizationName, githubUsername, avatarUrl } = req.body;
    const user = await User.findById(req.user?.userId);
    if (!user) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found.' } });
      return;
    }

    if (name !== undefined) user.name = name;
    if (bio !== undefined) user.bio = bio;
    if (title !== undefined) user.title = title;
    if (organizationName !== undefined) user.organizationName = organizationName;
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
    if (githubUsername !== undefined && githubUsername.trim() !== user.githubUsername) {
      user.githubUsername = githubUsername.trim();
      if (user.githubUsername) {
        await autoFetchAndSaveGitHubSkills(user, user.githubUsername);
      }
    }

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
        organizationName: user.organizationName,
        bio: user.bio,
        title: user.title,
        avatarUrl: user.avatarUrl,
        githubUsername: user.githubUsername,
        authProvider: user.authProvider,
        hasEnrolledFace: (user.enrolledFaceDescriptor?.length || 0) > 0,
        createdAt: user.createdAt,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'PROFILE_UPDATE_ERROR', message: err.message } });
  }
});


