import jwt from 'jsonwebtoken';
import { JWTPayload, IUser } from '../types';

export const generateAccessToken = (user: IUser): string => {
  const payload: JWTPayload = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
  };

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined');
  }

  return (jwt.sign as any)(payload, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

export const generateRefreshToken = (user: IUser): string => {
  const payload: JWTPayload = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
  };

  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET is not defined');
  }

  return (jwt.sign as any)(payload, secret, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  });
};

export const verifyAccessToken = (token: string): JWTPayload => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined');
  }

  try {
    return (jwt.verify as any)(token, secret) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid access token');
  }
};

export const verifyRefreshToken = (token: string): JWTPayload => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET is not defined');
  }

  try {
    return (jwt.verify as any)(token, secret) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};

// Note: Email verification and password reset tokens are now generated using crypto
// in the User model methods, not JWT. These functions are kept for reference
// but are not used in the current implementation. 