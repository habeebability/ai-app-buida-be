import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { AuthenticatedRequest } from '../types';
import { verifyAccessToken } from '../utils/jwt';
import User from '../models/User';
import logger from '../utils/logger';

// JWT Authentication middleware
export const authenticateJWT = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Access token is required',
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.userId).select('-password');
    
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    (req as AuthenticatedRequest).user = user;
    next();
  } catch (error) {
    logger.error('JWT Authentication error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};

// Passport JWT Authentication middleware
export const authenticatePassportJWT = passport.authenticate('jwt', { session: false });

// Role-based authorization middleware
export const authorizeRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    if (!roles.includes(authReq.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.',
      });
      return;
    }

    next();
  };
};

// Email verification middleware
export const requireEmailVerification = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
    return;
  }

  if (!authReq.user.isEmailVerified) {
    res.status(403).json({
      success: false,
      message: 'Email verification required',
    });
    return;
  }

  next();
};

// Optional authentication middleware (doesn't fail if no token)
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.userId).select('-password');
    
    if (user) {
      (req as AuthenticatedRequest).user = user;
    }
    
    next();
  } catch (error) {
    // Don't fail the request, just continue without user
    next();
  }
};

// Rate limiting for authentication endpoints
export const authRateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
};

// Session authentication middleware (for OAuth flows)
export const authenticateSession = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (req.isAuthenticated()) {
    return next();
  }
  
  res.status(401).json({
    success: false,
    message: 'Session authentication required',
  });
};

// Alias for authenticateJWT (commonly used in routes)
export const protect = authenticateJWT;
