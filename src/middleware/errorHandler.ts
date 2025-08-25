import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

// Custom error class
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public details?: any;

  constructor(message: string, statusCode: number, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Async error handler wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Global error handler
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = new AppError(message, 404);
  }

  // Mongoose duplicate key
  if ((err as any).code === 11000) {
    const field = Object.keys((err as any).keyValue)[0];
    const message = `Duplicate field value: ${field}. Please use another value.`;
    error = new AppError(message, 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values((err as any).errors)
      .map((val: any) => val.message)
      .join(', ');
    error = new AppError(message, 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = new AppError(message, 401);
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = new AppError(message, 401);
  }

  // OAuth errors
  if (err.name === 'OAuth2Error' || err.message?.includes('oauth')) {
    let message = 'OAuth authentication failed';
    const statusCode = 400;

    // Handle specific OAuth error types
    if (err.message?.includes('access_denied')) {
      message = 'OAuth access was denied by the user';
    } else if (err.message?.includes('invalid_grant')) {
      message = 'OAuth grant is invalid or expired';
    } else if (err.message?.includes('invalid_client')) {
      message = 'OAuth client configuration is invalid';
    } else if (err.message?.includes('invalid_request')) {
      message = 'OAuth request is malformed';
    } else if (err.message?.includes('server_error')) {
      message = 'OAuth provider server error';
    } else if (err.message?.includes('temporarily_unavailable')) {
      message = 'OAuth service temporarily unavailable';
    } else if (err.message?.includes('network')) {
      message = 'Network error during OAuth authentication';
    }

    error = new AppError(message, statusCode);
  }

  // Passport errors
  if (err.name === 'AuthenticationError') {
    const message = 'Authentication failed';
    error = new AppError(message, 401);
  }

  // Multer errors
  if (err.name === 'MulterError') {
    let message = 'File upload error';
    switch ((err as any).code) {
      case 'LIMIT_FILE_SIZE':
        message = 'File too large';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected file field';
        break;
    }
    error = new AppError(message, 400);
  }

  // Default error
  const statusCode = (error as AppError).statusCode || 500;
  const message = error.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

// 404 handler
export const notFound = (req: Request, res: Response, next: NextFunction): void => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404);
  next(error);
};

// Security error handler
export const securityErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err.name === 'UnauthorizedError') {
    res.status(401).json({
      success: false,
      message: 'Unauthorized access',
    });
    return;
  }

  if (err.name === 'ForbiddenError') {
    res.status(403).json({
      success: false,
      message: 'Access forbidden',
    });
    return;
  }

  next(err);
};

// Rate limit error handler
export const rateLimitErrorHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  res.status(429).json({
    success: false,
    message: 'Too many requests, please try again later',
  });
};

// Database connection error handler
export const databaseErrorHandler = (err: Error): void => {
  logger.error('Database connection error:', err);
  process.exit(1);
};

// Unhandled promise rejection handler
export const unhandledRejectionHandler = (reason: any, promise: Promise<any>): void => {
  logger.error('Unhandled Promise Rejection:', {
    reason,
    promise,
  });
  
  // Close server & exit process
  process.exit(1);
};

// Uncaught exception handler
export const uncaughtExceptionHandler = (err: Error): void => {
  logger.error('Uncaught Exception:', err);
  
  // Close server & exit process
  process.exit(1);
}; 