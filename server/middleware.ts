import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'skillforge-super-secret-jwt-key-2025';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'skillforge-super-secret-refresh-token-2025';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role?: 'student' | 'candidate' | 'recruiter' | 'admin' | 'institution';
  tenantId?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export function generateToken(payload: AuthenticatedUser): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: (JWT_EXPIRES_IN as any) || '7d' });
}

export function generateRefreshToken(payload: AuthenticatedUser): string {
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: (REFRESH_TOKEN_EXPIRES_IN as any) || '30d' });
}

export function verifyRefreshToken(token: string): AuthenticatedUser | null {
  try {
    return jwt.verify(token, REFRESH_TOKEN_SECRET) as AuthenticatedUser;
  } catch {
    return null;
  }
}

export function authenticateJWT(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required: missing or invalid Bearer token.',
      },
    });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role || 'candidate',
      tenantId: decoded.tenantId || 'default_tenant',
    };
    next();
  } catch (err) {
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired authentication session.',
      },
    });
  }
}

export function requireRole(allowedRoles: Array<'student' | 'candidate' | 'recruiter' | 'admin' | 'institution'>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required.',
        },
      });
      return;
    }

    const userRole = req.user.role || 'candidate';
    if (!allowedRoles.includes(userRole) && userRole !== 'admin') {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Requires one of roles: ${allowedRoles.join(', ')}.`,
        },
      });
      return;
    }

    next();
  };
}

