import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthenticatedRequest } from '../types';
import logger from '../utils/logger';
import User from '../models/User';

// Track suspicious activities
const suspiciousActivities = new Map<string, { count: number; lastAttempt: Date; blocked: boolean; blockUntil?: Date }>();

// Enhanced rate limiting configurations
export const createAdvancedRateLimit = (options: {
  windowMs: number;
  max: number;
  skipSuccessfulRequests?: boolean;
  keyGenerator?: (req: Request) => string;
  onLimitReached?: (req: Request, res: Response) => void;
}) => {
  const rateLimitOptions: any = {
    windowMs: options.windowMs,
    max: options.max,
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    keyGenerator: options.keyGenerator || ((req: Request) => {
      // Use combination of IP and user ID for authenticated requests
      const authReq = req as AuthenticatedRequest;
      const baseKey = req.ip || 'unknown';
      return authReq.user ? `${baseKey}:${authReq.user._id}` : baseKey;
    }),
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(options.windowMs / 1000),
    },
  };
  
  // Add handler if provided
  if (options.onLimitReached) {
    rateLimitOptions.handler = (req: Request, res: Response) => {
      const ip = req.ip || 'unknown';
      logger.warn('Rate limit exceeded', {
        ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.path,
        method: req.method,
      });
      options.onLimitReached!(req, res);
      res.status(429).json({
        success: false,
        message: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil(options.windowMs / 1000),
      });
    };
  }
  
  return rateLimit(rateLimitOptions);
};

// Strict authentication rate limiting
export const authRateLimit = createAdvancedRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '3'),
  skipSuccessfulRequests: true,
  onLimitReached: (req: Request, res: Response) => {
    const ip = req.ip || 'unknown';
    trackSuspiciousActivity(ip, 'rate_limit_auth');
  },
});

// API rate limiting (per minute)
export const apiRateLimit = createAdvancedRateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: parseInt(process.env.API_RATE_LIMIT_MAX || '30'),
});

// Strict rate limiting for sensitive operations
export const sensitiveOperationRateLimit = createAdvancedRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 attempts per hour
});

// Progressive rate limiting for failed login attempts
export const loginRateLimit = createAdvancedRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  skipSuccessfulRequests: true,
  keyGenerator: (req: Request) => {
    // Use email + IP combination for login attempts
    const email = req.body?.email?.toLowerCase() || '';
    const ip = req.ip || 'unknown';
    return `login:${email}:${ip}`;
  },
});

// Track suspicious activities
export const trackSuspiciousActivity = (
  identifier: string,
  activityType: string,
  details?: any
) => {
  const activity = suspiciousActivities.get(identifier) || {
    count: 0,
    lastAttempt: new Date(),
    blocked: false,
  };

  activity.count += 1;
  activity.lastAttempt = new Date();

  const threshold = parseInt(process.env.SUSPICIOUS_LOGIN_THRESHOLD || '5');
  const lockoutDuration = parseInt(process.env.ACCOUNT_LOCKOUT_DURATION || '900000'); // 15 minutes

  if (activity.count >= threshold && !activity.blocked) {
    activity.blocked = true;
    activity.blockUntil = new Date(Date.now() + lockoutDuration);
    
    logger.warn('Suspicious activity detected - blocking identifier', {
      identifier,
      activityType,
      attemptCount: activity.count,
      blockUntil: activity.blockUntil,
      details,
    });
  }

  suspiciousActivities.set(identifier, activity);
  
  // Clean up old entries (older than 24 hours)
  if (Date.now() - activity.lastAttempt.getTime() > 24 * 60 * 60 * 1000) {
    suspiciousActivities.delete(identifier);
  }
};

// Check if identifier is blocked
export const isBlocked = (identifier: string): boolean => {
  const activity = suspiciousActivities.get(identifier);
  if (!activity || !activity.blocked || !activity.blockUntil) {
    return false;
  }
  
  // Check if block period has expired
  if (Date.now() > activity.blockUntil.getTime()) {
    activity.blocked = false;
    activity.blockUntil = undefined;
    activity.count = 0; // Reset count after lockout expires
    suspiciousActivities.set(identifier, activity);
    return false;
  }
  
  return true;
};

// Middleware to check for blocked IPs/users
export const checkBlocked = (req: Request, res: Response, next: NextFunction): void => {
  const ip = req.ip || 'unknown';
  const email = req.body?.email?.toLowerCase();
  
  // Check IP blocking
  if (isBlocked(ip)) {
    const activity = suspiciousActivities.get(ip);
    logger.warn('Blocked IP attempted access', {
      ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path,
      blockUntil: activity?.blockUntil,
    });
    
    res.status(429).json({
      success: false,
      message: 'Access temporarily blocked due to suspicious activity. Please try again later.',
      retryAfter: activity?.blockUntil ? Math.ceil((activity.blockUntil.getTime() - Date.now()) / 1000) : 900,
    });
    return;
  }
  
  // Check email-based blocking for auth endpoints
  if (email && req.path.includes('/auth/')) {
    const emailKey = `email:${email}`;
    if (isBlocked(emailKey)) {
      const activity = suspiciousActivities.get(emailKey);
      logger.warn('Blocked email attempted login', {
        email,
        ip,
        userAgent: req.get('User-Agent'),
        blockUntil: activity?.blockUntil,
      });
      
      res.status(429).json({
        success: false,
        message: 'Account temporarily locked due to multiple failed login attempts.',
        retryAfter: activity?.blockUntil ? Math.ceil((activity.blockUntil.getTime() - Date.now()) / 1000) : 900,
      });
      return;
    }
  }
  
  next();
};

// Enhanced input sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  // Function to recursively sanitize object
  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      // Remove potential NoSQL injection patterns
      return obj
        .replace(/\$where/gi, '')
        .replace(/\$ne/gi, '')
        .replace(/\$gt/gi, '')
        .replace(/\$lt/gi, '')
        .replace(/\$regex/gi, '')
        .replace(/\$expr/gi, '')
        .replace(/\$jsonSchema/gi, '')
        .replace(/\$mod/gi, '')
        .replace(/\$text/gi, '')
        .replace(/\$search/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
    } else if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    } else if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // Sanitize key names too
        const cleanKey = key.replace(/[^a-zA-Z0-9_.-]/g, '');
        if (cleanKey && cleanKey.length > 0) {
          sanitized[cleanKey] = sanitizeObject(value);
        }
      }
      return sanitized;
    }
    return obj;
  };

  // Sanitize request body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  next();
};

// Security headers middleware (additional to helmet)
export const additionalSecurityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  // Prevent information disclosure
  res.removeHeader('X-Powered-By');
  
  // Additional security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // HSTS for production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }
  
  next();
};

// Monitor for suspicious patterns
export const suspiciousPatternDetection = (req: Request, res: Response, next: NextFunction): void => {
  const userAgent = req.get('User-Agent') || '';
  const ip = req.ip || 'unknown';
  
  // Check for common attack patterns
  const suspiciousPatterns = [
    /sqlmap/i,
    /burpsuite/i,
    /nikto/i,
    /gobuster/i,
    /dirb/i,
    /masscan/i,
    /nmap/i,
    /curl.*python/i,
    /wget.*perl/i,
    /<script/i,
    /union.*select/i,
    /drop.*table/i,
    /\$where/i,
    /\$ne/i,
    /javascript:/i,
    /data:text\/html/i,
  ];
  
  const requestString = `${req.method} ${req.path} ${JSON.stringify(req.body)} ${JSON.stringify(req.query)} ${userAgent}`;
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(requestString)) {
      logger.warn('Suspicious pattern detected', {
        ip,
        userAgent,
        method: req.method,
        path: req.path,
        pattern: pattern.source,
        body: req.body,
        query: req.query,
      });
      
      trackSuspiciousActivity(ip, 'suspicious_pattern', {
        pattern: pattern.source,
        endpoint: req.path,
      });
      
      // Don't block immediately, but increase suspicion level
      break;
    }
  }
  
  next();
};

// Validate file upload security
export const validateFileUpload = (req: Request, res: Response, next: NextFunction): void => {
  // Check if request contains file uploads
  if (req.file || req.files) {
    const files: any[] = [];
    
    if (req.files) {
      if (Array.isArray(req.files)) {
        files.push(...req.files);
      } else {
        files.push(req.files);
      }
    }
    
    if (req.file) {
      files.push(req.file);
    }
    
    for (const file of files) {
      if (!file || typeof file !== 'object') continue;
      
      // Check file size
      const maxSize = parseInt(process.env.MAX_FILE_SIZE?.replace(/[^0-9]/g, '') || '5') * 1024 * 1024;
      if (typeof file.size === 'number' && file.size > maxSize) {
        res.status(413).json({
          success: false,
          message: `File too large. Maximum size is ${process.env.MAX_FILE_SIZE || '5mb'}`,
        });
        return;
      }
      
      // Check file type
      const allowedMimeTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'text/plain',
        'application/json',
      ];
      
      if (file.mimetype && !allowedMimeTypes.includes(file.mimetype)) {
        res.status(400).json({
          success: false,
          message: 'File type not allowed',
        });
        return;
      }
      
      // Check filename for path traversal
      if (file.originalname && 
          (file.originalname.includes('..') || 
           file.originalname.includes('/') || 
           file.originalname.includes('\\'))) {
        logger.warn('Path traversal attempt detected in filename', {
          ip: req.ip,
          filename: file.originalname,
          userAgent: req.get('User-Agent'),
        });
        
        res.status(400).json({
          success: false,
          message: 'Invalid filename',
        });
        return;
      }
    }
  }
  
  next();
};

// Enhanced CORS validation
export const validateCorsOrigin = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
  const allowedOrigins = process.env.NODE_ENV === 'production'
    ? [process.env.FRONTEND_URL].filter(Boolean)
    : [
        process.env.FRONTEND_URL || 'http://localhost:3000',
        'http://localhost:3000',
        'http://localhost:3001',
      ];

  // Allow requests with no origin in development (for testing)
  if (!origin && process.env.NODE_ENV === 'development') {
    return callback(null, true);
  }

  if (!origin) {
    logger.warn('Request without origin header rejected', {
      timestamp: new Date().toISOString(),
    });
    return callback(new Error('Origin header required'), false);
  }

  // Strict origin validation
  if (allowedOrigins.includes(origin)) {
    return callback(null, true);
  }

  // Log suspicious origin attempts
  logger.warn('CORS violation detected', {
    origin,
    allowedOrigins,
    timestamp: new Date().toISOString(),
  });

  return callback(new Error('Not allowed by CORS'), false);
};

// JWT token validation enhancement
export const enhancedJWTValidation = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    
    // Check token length and format
    if (token.length < 100 || token.length > 500) {
      logger.warn('Suspicious JWT token length', {
        ip: req.ip,
        tokenLength: token.length,
        userAgent: req.get('User-Agent'),
      });
      
      res.status(401).json({
        success: false,
        message: 'Invalid token format',
      });
      return;
    }
    
    // Check for basic JWT structure (header.payload.signature)
    const parts = token.split('.');
    if (parts.length !== 3) {
      res.status(401).json({
        success: false,
        message: 'Invalid token format',
      });
      return;
    }
  }
  
  next();
};

// Validate user permissions for resource access
export const validateResourceAccess = (resourceType: 'project' | 'chat' | 'user') => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?._id;
      const resourceId = req.params.id || req.params.projectId || req.params.chatId;
      
      if (!userId || !resourceId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }
      
      // Check resource ownership based on type
      let hasAccess = false;
      
      switch (resourceType) {
        case 'project':
          const Project = (await import('../models/Project')).default;
          const project = await Project.findOne({ _id: resourceId, userId });
          hasAccess = !!project;
          break;
          
        case 'chat':
          const Chat = (await import('../models/Chat')).default;
          const chat = await Chat.findOne({ _id: resourceId, userId });
          hasAccess = !!chat;
          break;
          
        case 'user':
          hasAccess = userId.toString() === resourceId;
          break;
      }
      
      if (!hasAccess) {
        logger.warn('Unauthorized resource access attempt', {
          userId: userId.toString(),
          resourceType,
          resourceId,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
        });
        
        res.status(403).json({
          success: false,
          message: 'Access denied',
        });
        return;
      }
      
      next();
    } catch (error) {
      logger.error('Resource access validation error', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  };
};

// Clean up old suspicious activity records periodically
setInterval(() => {
  const now = Date.now();
  const dayAgo = now - (24 * 60 * 60 * 1000);
  
  for (const [key, activity] of suspiciousActivities.entries()) {
    if (activity.lastAttempt.getTime() < dayAgo) {
      suspiciousActivities.delete(key);
    }
  }
}, 60 * 60 * 1000); // Clean up every hour

export default {
  authRateLimit,
  apiRateLimit,
  sensitiveOperationRateLimit,
  loginRateLimit,
  trackSuspiciousActivity,
  isBlocked,
  checkBlocked,
  sanitizeInput,
  additionalSecurityHeaders,
  enhancedJWTValidation,
  validateResourceAccess,
  validateFileUpload,
  validateCorsOrigin,
};
