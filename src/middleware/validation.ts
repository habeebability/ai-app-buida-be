import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { ValidationError } from '../types';
import DOMPurify from 'isomorphic-dompurify';
import logger from '../utils/logger';

// Enhanced validation result handler with security logging
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const validationErrors: ValidationError[] = errors.array().map(error => ({
      field: error.type === 'field' ? error.path : 'unknown',
      message: error.msg,
    }));

    // Log validation failures for security monitoring
    logger.warn('Validation failed', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path,
      method: req.method,
      errors: validationErrors,
      suspiciousPatterns: detectSuspiciousInput(req.body),
    });

    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: validationErrors,
    });
    return;
  }
  
  next();
};

// Detect suspicious input patterns
const detectSuspiciousInput = (body: any): string[] => {
  const suspicious: string[] = [];
  const input = JSON.stringify(body || {}).toLowerCase();
  
  const patterns = [
    { name: 'SQL Injection', regex: /(union|select|insert|delete|drop|create|alter|exec|script)/i },
    { name: 'NoSQL Injection', regex: /(\$where|\$ne|\$gt|\$lt|\$regex|\$expr)/i },
    { name: 'XSS Attempt', regex: /(<script|javascript:|on\w+\s*=|vbscript:|data:text\/html)/i },
    { name: 'Path Traversal', regex: /(\.\.\/|\.\.\\\.\.|%2e%2e%2f|%2e%2e%5c)/i },
    { name: 'Command Injection', regex: /(;\s*(cat|ls|pwd|whoami|id|uname|wget|curl|nc|ncat|telnet))/i },
  ];
  
  patterns.forEach(pattern => {
    if (pattern.regex.test(input)) {
      suspicious.push(pattern.name);
    }
  });
  
  return suspicious;
};

// Enhanced HTML sanitization
const sanitizeHtml = (input: string): string => {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
};

// Custom validation for secure strings
const secureString = (field: string, options: { min?: number; max?: number; allowHtml?: boolean } = {}) => {
  return body(field)
    .isString()
    .withMessage(`${field} must be a string`)
    .trim()
    .isLength({ min: options.min || 1, max: options.max || 1000 })
    .withMessage(`${field} must be between ${options.min || 1} and ${options.max || 1000} characters`)
    .custom((value: string) => {
      // Check for NoSQL injection patterns
      const nosqlPatterns = /\$(where|ne|gt|lt|gte|lte|regex|expr|jsonSchema|mod|text|search|geoIntersects|geoWithin|near|nearSphere)/i;
      if (nosqlPatterns.test(value)) {
        throw new Error(`${field} contains invalid characters`);
      }
      
      // Sanitize HTML if not allowed
      if (!options.allowHtml) {
        const sanitized = sanitizeHtml(value);
        if (sanitized !== value) {
          throw new Error(`${field} contains invalid HTML content`);
        }
      }
      
      return true;
    });
};

// User registration validation
export const validateRegistration = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name can only contain letters and spaces'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name can only contain letters and spaces'),
  handleValidationErrors,
];

// User login validation
export const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors,
];

// Forgot password validation
export const validateForgotPassword = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  handleValidationErrors,
];

// Reset password validation
export const validateResetPassword = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  handleValidationErrors,
];

// Email verification validation
export const validateEmailVerification = [
  param('token')
    .notEmpty()
    .withMessage('Verification token is required'),
  handleValidationErrors,
];

// User profile update validation
export const validateProfileUpdate = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name can only contain letters and spaces'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name can only contain letters and spaces'),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters'),
  body('preferences.notifications.email')
    .optional()
    .isBoolean()
    .withMessage('Email notification preference must be a boolean'),
  body('preferences.notifications.push')
    .optional()
    .isBoolean()
    .withMessage('Push notification preference must be a boolean'),
  body('preferences.privacy.profileVisibility')
    .optional()
    .isIn(['public', 'private'])
    .withMessage('Profile visibility must be either public or private'),
  body('preferences.privacy.showEmail')
    .optional()
    .isBoolean()
    .withMessage('Show email preference must be a boolean'),
  handleValidationErrors,
];

// Mentor profile validation
export const validateMentorProfile = [
  body('expertise')
    .isArray({ min: 1 })
    .withMessage('At least one expertise area is required'),
  body('expertise.*')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Expertise must be between 2 and 50 characters'),
  body('hourlyRate')
    .isFloat({ min: 10, max: 1000 })
    .withMessage('Hourly rate must be between $10 and $1000'),
  body('availability.days')
    .isArray({ min: 1 })
    .withMessage('At least one available day is required'),
  body('availability.days.*')
    .isIn(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
    .withMessage('Invalid day of the week'),
  body('availability.hours.start')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Start time must be in HH:MM format'),
  body('availability.hours.end')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('End time must be in HH:MM format'),
  body('languages')
    .isArray({ min: 1 })
    .withMessage('At least one language is required'),
  body('languages.*')
    .trim()
    .isLength({ min: 2, max: 30 })
    .withMessage('Language must be between 2 and 30 characters'),
  body('experience')
    .isInt({ min: 0, max: 50 })
    .withMessage('Experience must be between 0 and 50 years'),
  body('education')
    .optional()
    .isArray()
    .withMessage('Education must be an array'),
  body('education.*.degree')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Degree must be between 2 and 100 characters'),
  body('education.*.institution')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Institution must be between 2 and 100 characters'),
  body('education.*.year')
    .optional()
    .isInt({ min: 1900, max: new Date().getFullYear() })
    .withMessage('Year must be between 1900 and current year'),
  body('certifications')
    .optional()
    .isArray()
    .withMessage('Certifications must be an array'),
  body('certifications.*.name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Certification name must be between 2 and 100 characters'),
  body('certifications.*.issuer')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Certification issuer must be between 2 and 100 characters'),
  body('certifications.*.year')
    .optional()
    .isInt({ min: 1900, max: new Date().getFullYear() })
    .withMessage('Certification year must be between 1900 and current year'),
  handleValidationErrors,
];

// Session creation validation
export const validateSessionCreation = [
  body('mentorId')
    .isMongoId()
    .withMessage('Valid mentor ID is required'),
  body('scheduledAt')
    .isISO8601()
    .withMessage('Valid date and time is required')
    .custom((value) => {
      const date = new Date(value);
      if (date <= new Date()) {
        throw new Error('Session must be scheduled for a future date and time');
      }
      return true;
    }),
  body('duration')
    .isInt({ min: 15, max: 480 })
    .withMessage('Duration must be between 15 and 480 minutes'),
  body('topic')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Topic must be between 5 and 200 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  body('meetingLink')
    .optional()
    .isURL()
    .withMessage('Meeting link must be a valid URL'),
  handleValidationErrors,
];

// Session update validation
export const validateSessionUpdate = [
  body('status')
    .optional()
    .isIn(['pending', 'confirmed', 'completed', 'cancelled'])
    .withMessage('Invalid session status'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Notes cannot exceed 2000 characters'),
  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('review')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Review cannot exceed 1000 characters'),
  handleValidationErrors,
];

// Pagination validation
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('sort')
    .optional()
    .isString()
    .withMessage('Sort must be a string'),
  query('order')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Order must be either asc or desc'),
  handleValidationErrors,
];

// Mentor search validation
export const validateMentorSearch = [
  query('expertise')
    .optional()
    .isArray()
    .withMessage('Expertise must be an array'),
  query('expertise.*')
    .optional()
    .isString()
    .withMessage('Expertise items must be strings'),
  query('minRate')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum rate must be a positive number'),
  query('maxRate')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum rate must be a positive number'),
  query('languages')
    .optional()
    .isArray()
    .withMessage('Languages must be an array'),
  query('languages.*')
    .optional()
    .isString()
    .withMessage('Language items must be strings'),
  query('rating')
    .optional()
    .isFloat({ min: 0, max: 5 })
    .withMessage('Rating must be between 0 and 5'),
  handleValidationErrors,
];

// ObjectId validation
export const validateObjectId = [
  param('id')
    .isMongoId()
    .withMessage('Valid ID is required'),
  handleValidationErrors,
]; 