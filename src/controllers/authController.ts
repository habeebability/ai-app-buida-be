import { Request, Response } from 'express';
import passport from 'passport';
import { AuthenticatedRequest } from '../types';
import { 
  generateAccessToken, 
  generateRefreshToken
} from '../utils/jwt';
import { 
  sendWelcomeEmail, 
  sendEmailVerification, 
  sendPasswordReset 
} from '../utils/email';
import User from '../models/User';
import { asyncHandler } from '../middleware/errorHandler';
import { AppError } from '../middleware/errorHandler';
import { trackSuspiciousActivity } from '../middleware/security';
import logger from '../utils/logger';
import crypto from 'crypto';

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, password, firstName, lastName } = req.body;

  // Normalize email (lowercase but preserve dots)
  const normalizedEmail = email.toLowerCase().trim();

  // Check if user already exists
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new AppError('User with this email already exists', 400);
  }

  // Create user
  const user = await User.create({
    email: normalizedEmail,
    password,
    firstName,
    lastName,
  });

  // Generate email verification token
  const verificationToken = user.generateEmailVerificationToken();
  await user.save();

  // Send verification email
  try {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    await sendEmailVerification(user.email, user.firstName, verificationUrl);
  } catch (error) {
    logger.error('Failed to send verification email:', error);
    // Don't fail the registration, just log the error
  }

  // Send welcome email
  try {
    await sendWelcomeEmail(user.email, user.firstName);
  } catch (error) {
    logger.error('Failed to send welcome email:', error);
  }

  res.status(201).json({
    success: true,
    message: 'User registered successfully. Please check your email to verify your account.',
    data: {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
      requiresVerification: true,
    },
  });
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  const ip = req.ip || 'unknown';
  const userAgent = req.get('User-Agent') || 'unknown';

  // Normalize email (lowercase but preserve dots)
  const normalizedEmail = email.toLowerCase().trim();

  try {
    // Check if user exists and password is correct
    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    
    if (!user || !(await user.comparePassword(password))) {
      // Track failed login attempt
      trackSuspiciousActivity(`email:${normalizedEmail}`, 'failed_login', {
        ip,
        userAgent,
        email: normalizedEmail,
      });
      trackSuspiciousActivity(ip, 'failed_login', {
        email: normalizedEmail,
        userAgent,
      });
      
      logger.warn('Failed login attempt', {
        email: normalizedEmail,
        ip,
        userAgent,
        reason: !user ? 'user_not_found' : 'invalid_password',
      });
      
      throw new AppError('Invalid email or password', 401);
    }

    // Check if user is verified - REQUIRED for login
    if (!user.isEmailVerified) {
      logger.warn('Unverified user login attempt', {
        email: normalizedEmail,
        userId: user._id.toString(),
        ip,
        userAgent,
      });
      
      throw new AppError('Please verify your email before logging in. Check your inbox for a verification link.', 401);
    }

    // Generate secure tokens only for verified users
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    
    // Create secure session fingerprint
    const sessionFingerprint = crypto.randomBytes(32).toString('hex');
    
    // Log successful login
    logger.info('Successful login', {
      userId: user._id.toString(),
      email: normalizedEmail,
      ip,
      userAgent,
      sessionFingerprint,
    });

    // Set secure cookie options
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      maxAge: 15 * 60 * 1000, // 15 minutes
    };
    
    // Set session fingerprint cookie
    res.cookie('sessionFingerprint', sessionFingerprint, cookieOptions);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
        sessionFingerprint, // Include in response for client-side storage
      },
    });
  } catch (error) {
    // Don't leak information about why login failed
    if (error instanceof AppError) {
      throw error;
    }
    
    logger.error('Login error', {
      email: normalizedEmail,
      ip,
      userAgent,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    throw new AppError('Login failed. Please try again.', 500);
  }
});

// @desc    Refresh token
// @route   POST /api/auth/refresh
// @access  Public
export const refreshToken = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new AppError('Refresh token is required', 400);
  }

  try {
    const { verifyRefreshToken } = await import('../utils/jwt');
    const payload = verifyRefreshToken(refreshToken);
    
    const user = await User.findById(payload.userId);
    if (!user) {
      throw new AppError('User not found', 401);
    }

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        tokens: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        },
      },
    });
  } catch (error) {
    throw new AppError('Invalid refresh token', 401);
  }
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logout = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  // In a stateless JWT setup, logout is handled client-side
  // You might want to implement a blacklist for tokens in production
  
  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export const getMe = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = await User.findById(req.user!._id);
  
  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.status(200).json({
    success: true,
    message: 'User retrieved successfully',
    data: {
      user,
    },
  });
});

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    // Don't reveal if user exists or not for security
    res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
    return;
  }

  // Generate password reset token
  const resetToken = user.generatePasswordResetToken();
  await user.save();

  // Send password reset email
  try {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    await sendPasswordReset(user.email, user.firstName, resetUrl);
  } catch (error) {
    user.clearPasswordResetToken();
    await user.save();
    throw new AppError('Email could not be sent', 500);
  }

  res.status(200).json({
    success: true,
    message: 'If an account with that email exists, a password reset link has been sent.',
  });
});

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { token, password } = req.body;

  // Hash the token to match what's stored in the database
  const crypto = require('crypto');
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  
  // Get user with reset token
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  }).select('+password');

  if (!user) {
    throw new AppError('Invalid or expired reset token', 400);
  }

  // Set new password
  user.password = password;
  user.clearPasswordResetToken();
  await user.save();

  // Generate new tokens
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  res.status(200).json({
    success: true,
    message: 'Password reset successful',
    data: {
      tokens: {
        accessToken,
        refreshToken,
      },
    },
  });
});

// @desc    Verify email
// @route   GET /api/auth/verify-email/:token
// @access  Public
export const verifyEmail = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { token } = req.params;

  if (!token) {
    throw new AppError('Verification token is required', 400);
  }

  // Hash the token to match what's stored in the database
  const crypto = require('crypto');
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  
  // Get user with verification token
  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() },
  });

  if (!user) {
    throw new AppError('Invalid or expired verification token', 400);
  }

  // Mark email as verified
  user.isEmailVerified = true;
  user.clearEmailVerificationToken();
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Email verified successfully',
  });
});

// @desc    Resend verification email (authenticated)
// @route   POST /api/auth/resend-verification
// @access  Private
export const resendVerification = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = await User.findById(req.user!._id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.isEmailVerified) {
    throw new AppError('Email is already verified', 400);
  }

  // Generate new verification token
  const verificationToken = user.generateEmailVerificationToken();
  await user.save();

  // Send verification email
  try {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    await sendEmailVerification(user.email, user.firstName, verificationUrl);
  } catch (error) {
    logger.error('Failed to send verification email:', error);
    throw new AppError('Failed to send verification email', 500);
  }

  res.status(200).json({
    success: true,
    message: 'Verification email sent successfully',
  });
});

// @desc    Resend verification email (public - for unauthenticated users)
// @route   POST /api/auth/resend-verification-email
// @access  Public
export const resendVerificationEmail = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;

  if (!email) {
    throw new AppError('Email is required', 400);
  }

  // Normalize email
  const normalizedEmail = email.toLowerCase().trim();

  // Find user by email
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    // Don't reveal if user exists or not for security
    res.status(200).json({
      success: true,
      message: 'If an account with this email exists, a verification email has been sent.',
    });
    return;
  }

  if (user.isEmailVerified) {
    // Don't reveal if user exists or not for security
    res.status(200).json({
      success: true,
      message: 'If an account with this email exists, a verification email has been sent.',
    });
    return;
  }

  // Generate new verification token
  const verificationToken = user.generateEmailVerificationToken();
  await user.save();

  // Send verification email
  try {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    await sendEmailVerification(user.email, user.firstName, verificationUrl);
  } catch (error) {
    logger.error('Failed to send verification email:', error);
    // Don't reveal the error to the client for security
  }

  res.status(200).json({
    success: true,
    message: 'If an account with this email exists, a verification email has been sent.',
  });
});

// @desc    Google OAuth
// @route   GET /api/auth/google
// @access  Public
export const googleAuth = passport.authenticate('google', {
  scope: ['profile', 'email'],
});

// @desc    Google OAuth callback
// @route   GET /api/auth/google/callback
// @access  Public
export const googleAuthCallback = (req: Request, res: Response): void => {
  const frontendUrl = process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? 'https://app-buida-fe.vercel.app' : 'http://localhost:3000');
  
  passport.authenticate('google', { session: false }, (err: any, user: any, info: any) => {
    if (err) {
      logger.error('Google OAuth error:', {
        error: err.message,
        stack: err.stack,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
      });
      
      // Handle specific OAuth errors
      if (err.message?.includes('access_denied')) {
        return res.redirect(`${frontendUrl}/auth/cancelled?provider=google`);
      }
      
      if (err.message?.includes('invalid_grant')) {
        return res.redirect(`${frontendUrl}/login?error=oauth_invalid_grant&provider=google`);
      }

      if (err.message?.includes('network')) {
        return res.redirect(`${frontendUrl}/login?error=oauth_network_error&provider=google`);
      }

      // Generic OAuth error
      return res.redirect(`${frontendUrl}/login?error=oauth_failed&provider=google&message=${encodeURIComponent(err.message)}`);
    }

    if (!user) {
      logger.warn('Google OAuth: No user returned', {
        info,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
      });
      return res.redirect(`${frontendUrl}/auth/cancelled?provider=google`);
    }

    // Check if user account is properly created/retrieved
    if (!user._id) {
      logger.error('Google OAuth: User object missing _id', { user });
      return res.redirect(`${frontendUrl}/login?error=oauth_user_creation_failed&provider=google`);
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    logger.info('Google OAuth successful login', {
      userId: user._id,
      email: user.email,
      provider: 'google',
    });

    // Redirect to auth callback (frontend will handle token storage and redirect)
    res.redirect(
      `${frontendUrl}/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}&provider=google&oauth_success=true`
    );
  })(req, res);
};

// @desc    GitHub OAuth
// @route   GET /api/auth/github
// @access  Public
export const githubAuth = passport.authenticate('github', {
  scope: ['user:email'],
});

// @desc    GitHub OAuth callback
// @route   GET /api/auth/github/callback
// @access  Public
export const githubAuthCallback = (req: Request, res: Response): void => {
  const frontendUrl = process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? 'https://app-buida-fe.vercel.app' : 'http://localhost:3000');
  
  passport.authenticate('github', { session: false }, (err: any, user: any, info: any) => {
    if (err) {
      logger.error('GitHub OAuth error:', {
        error: err.message,
        stack: err.stack,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
      });
      
      // Handle specific OAuth errors
      if (err.message?.includes('access_denied')) {
        return res.redirect(`${frontendUrl}/auth/cancelled?provider=github`);
      }
      
      if (err.message?.includes('invalid_grant')) {
        return res.redirect(`${frontendUrl}/login?error=oauth_invalid_grant&provider=github`);
      }

      if (err.message?.includes('network')) {
        return res.redirect(`${frontendUrl}/login?error=oauth_network_error&provider=github`);
      }

      // Handle GitHub-specific errors
      if (err.message?.includes('bad_verification_code')) {
        return res.redirect(`${frontendUrl}/login?error=oauth_bad_verification_code&provider=github`);
      }

      // Generic OAuth error
      return res.redirect(`${frontendUrl}/login?error=oauth_failed&provider=github&message=${encodeURIComponent(err.message)}`);
    }

    if (!user) {
      logger.warn('GitHub OAuth: No user returned', {
        info,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
      });
      return res.redirect(`${frontendUrl}/auth/cancelled?provider=github`);
    }

    // Check if user account is properly created/retrieved
    if (!user._id) {
      logger.error('GitHub OAuth: User object missing _id', { user });
      return res.redirect(`${frontendUrl}/login?error=oauth_user_creation_failed&provider=github`);
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    logger.info('GitHub OAuth successful login', {
      userId: user._id,
      email: user.email,
      provider: 'github',
    });

    // Redirect to auth callback (frontend will handle token storage and redirect)
    res.redirect(
      `${frontendUrl}/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}&provider=github&oauth_success=true`
    );
  })(req, res);
};


