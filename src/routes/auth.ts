import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  register,
  login,
  refreshToken,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  resendVerificationEmail,
  googleAuth,
  googleAuthCallback,
  githubAuth,
  githubAuthCallback,
} from '../controllers/authController';
import {
  validateRegistration,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateEmailVerification,
} from '../middleware/validation';
import {
  authenticateJWT,
  authorizeRoles,
  requireEmailVerification,
} from '../middleware/auth';
import { authRateLimit } from '../middleware/auth';
import logger from '../utils/logger';

const router = express.Router();

// Rate limiting for auth routes
const authLimiter = rateLimit(authRateLimit);

// Public routes
router.post('/register', validateRegistration, register);
router.post('/login', validateLogin, login);
router.post('/refresh', refreshToken);
router.post('/forgot-password', validateForgotPassword, forgotPassword);
router.post('/reset-password', validateResetPassword, resetPassword);
router.get('/verify-email/:token', validateEmailVerification, verifyEmail);
router.post('/resend-verification-email', resendVerificationEmail);

// OAuth routes - only register if strategies are available
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  router.get('/google', googleAuth);
  router.get('/google/callback', googleAuthCallback);
  logger.info('Google OAuth routes registered');
} else {
  // Return error for Google OAuth when not configured
  router.get('/google', (req, res) => {
    res.status(503).json({
      success: false,
      message: 'Google OAuth is not configured. Please contact the administrator.',
    });
  });
  router.get('/google/callback', (req, res) => {
    res.status(503).json({
      success: false,
      message: 'Google OAuth is not configured. Please contact the administrator.',
    });
  });
  logger.warn('Google OAuth routes disabled - credentials not provided');
}

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  router.get('/github', githubAuth);
  router.get('/github/callback', githubAuthCallback);
  logger.info('GitHub OAuth routes registered');
} else {
  // Return error for GitHub OAuth when not configured
  router.get('/github', (req, res) => {
    res.status(503).json({
      success: false,
      message: 'GitHub OAuth is not configured. Please contact the administrator.',
    });
  });
  router.get('/github/callback', (req, res) => {
    res.status(503).json({
      success: false,
      message: 'GitHub OAuth is not configured. Please contact the administrator.',
    });
  });
  logger.warn('GitHub OAuth routes disabled - credentials not provided');
}

// Protected routes (require email verification)
router.post('/logout', authenticateJWT, requireEmailVerification, logout);
router.get('/me', authenticateJWT, requireEmailVerification, getMe);
router.post('/resend-verification', authenticateJWT, resendVerification);
// Admin routes can be added later if needed

export default router; 