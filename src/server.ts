// Load environment variables first
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import rateLimit from 'express-rate-limit';
import passport from 'passport';

// Import configurations
import connectDB from './config/database';
import './config/passport';

// Import middleware
import { errorHandler, notFound } from './middleware/errorHandler';

// Import routes
import authRoutes from './routes/auth';
import generateAppRoutes from './routes/generateApp';
import projectRoutes from './routes/projects';

// Import utilities
import logger from './utils/logger';

// Create Express app
const app = express();

// Connect to MongoDB
connectDB();

// Basic security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for development
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
const getCorsOrigins = () => {
  if (process.env.NODE_ENV === 'production') {
    // Production: only allow specific frontend URL
    return [process.env.FRONTEND_URL].filter(Boolean);
  } else {
    // Development: allow common development ports
    return [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173', // Vite
      'http://localhost:4173', // Vite preview
      'http://localhost:8080', // webpack-dev-server
    ];
  }
};

// Simple CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL || false
    : true, // Allow all in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-session-secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-app-builder',
    ttl: 24 * 60 * 60, // 1 day
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 1 day
  },
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Basic rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/generate-app', generateAppRoutes);
app.use('/api/projects', projectRoutes);

// 404 handler
app.use(notFound);

// Error handling middleware
app.use(errorHandler);

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection:', { reason, promise });
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

// Start server
const PORT = process.env.PORT || 5001;

const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

export default app; 