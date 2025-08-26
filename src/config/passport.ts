import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { IUser } from '../types';
import User from '../models/User';
import logger from '../utils/logger';

// JWT Strategy
passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET || 'fallback-secret',
    },
    async (payload, done) => {
      try {
        const user = await User.findById(payload.userId).select('-password');
        if (user) {
          return done(null, user);
        }
        return done(null, false);
      } catch (error) {
        logger.error('JWT Strategy error:', error);
        return done(error, false);
      }
    }
  )
);

// Google OAuth Strategy - only initialize if credentials are provided
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || (process.env.NODE_ENV === 'production' ? 'https://ai-app-buida-be-1.onrender.com/api/auth/google/callback' : 'http://localhost:5001/api/auth/google/callback'),
        scope: ['profile', 'email'],
      },
      async (accessToken: string, refreshToken: string, profile: any, done: any) => {
        try {
          const email = profile.emails?.[0]?.value;
          
          if (!email) {
            logger.error('Google OAuth: No email found in profile', { profile });
            return done(new Error('Email not found in Google profile'), false);
          }

          // Check if user already exists
          let user = await User.findOne({ email });

          if (user) {
            // Update social account info
            user.socialAccounts.google = profile.id;
            if (!user.avatar && profile.photos?.[0]?.value) {
              user.avatar = profile.photos[0].value;
            }
            await user.save();
            logger.info('Google OAuth: Existing user logged in', { userId: user._id, email });
            return done(null, user);
          }

          // Create new user
          user = await User.create({
            email,
            firstName: profile.name?.givenName || '',
            lastName: profile.name?.familyName || '',
            avatar: profile.photos?.[0]?.value,
            socialAccounts: { google: profile.id },
            isEmailVerified: true, // Google emails are verified
            role: 'user',
          });

          logger.info('Google OAuth: New user created', { userId: user._id, email });
          return done(null, user);
        } catch (error: any) {
          logger.error('Google OAuth strategy error:', {
            error: error.message,
            stack: error.stack,
            profile: { id: profile.id, emails: profile.emails },
          });
          return done(error, false);
        }
      }
    )
  );
  logger.info('Google OAuth strategy initialized');
} else {
  logger.warn('Google OAuth credentials not provided - Google OAuth disabled');
}

// GitHub OAuth Strategy - only initialize if credentials are provided
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: process.env.GITHUB_CALLBACK_URL || (process.env.NODE_ENV === 'production' ? 'https://ai-app-buida-be-1.onrender.com/api/auth/github/callback' : 'http://localhost:5001/api/auth/github/callback'),
        scope: ['user:email'],
      },
      async (accessToken: string, refreshToken: string, profile: any, done: any) => {
        try {
          const email = profile.emails?.[0]?.value;
          
          if (!email) {
            logger.error('GitHub OAuth: No email found in profile', { profile });
            return done(new Error('Email not found in GitHub profile'), false);
          }

          // Check if user already exists
          let user = await User.findOne({ email });

          if (user) {
            // Update social account info
            user.socialAccounts.github = profile.id;
            if (!user.avatar && profile.photos?.[0]?.value) {
              user.avatar = profile.photos[0].value;
            }
            await user.save();
            logger.info('GitHub OAuth: Existing user logged in', { userId: user._id, email });
            return done(null, user);
          }

          // Create new user
          user = await User.create({
            email,
            firstName: profile.displayName?.split(' ')[0] || '',
            lastName: profile.displayName?.split(' ').slice(1).join(' ') || '',
            avatar: profile.photos?.[0]?.value,
            socialAccounts: { github: profile.id },
            isEmailVerified: true, // GitHub emails are verified
            role: 'user',
          });

          logger.info('GitHub OAuth: New user created', { userId: user._id, email });
          return done(null, user);
        } catch (error: any) {
          logger.error('GitHub OAuth strategy error:', {
            error: error.message,
            stack: error.stack,
            profile: { id: profile.id, emails: profile.emails },
          });
          return done(error, false);
        }
      }
    )
  );
  logger.info('GitHub OAuth strategy initialized');
} else {
  logger.warn('GitHub OAuth credentials not provided - GitHub OAuth disabled');
}

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id).select('-password');
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport; 