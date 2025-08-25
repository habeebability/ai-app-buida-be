# CodeMentor Backend API

A robust Express.js backend API for CodeMentor - a platform where developers can get help from expert mentors when they're stuck while coding.

## Features

- 🔐 **Authentication & Authorization**
  - JWT-based authentication
  - Email/password registration and login
  - Google OAuth integration
  - GitHub OAuth integration
  - Email verification
  - Password reset functionality
  - Role-based access control

- 🛡️ **Security**
  - Password hashing with bcrypt
  - Rate limiting
  - CORS protection
  - Helmet security headers
  - Input validation and sanitization
  - JWT token management

- 📧 **Email Services**
  - Welcome emails
  - Email verification
  - Password reset emails
  - Session confirmation emails
  - Powered by Resend

- 🗄️ **Database**
  - MongoDB with Mongoose ODM
  - Optimized indexes
  - Data validation
  - Relationship management

- 📝 **Logging & Monitoring**
  - Winston logger
  - Request logging with Morgan
  - Error tracking
  - Performance monitoring

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: Passport.js, JWT
- **Email**: Resend
- **File Upload**: Multer, Cloudinary
- **Validation**: Express-validator
- **Security**: Helmet, bcrypt, rate-limiting
- **Logging**: Winston, Morgan

## Prerequisites

- Node.js (v18 or higher)
- MongoDB database
- Google OAuth credentials
- GitHub OAuth credentials
- Resend API key
- Cloudinary account (optional, for file uploads)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd be
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Fill in your environment variables in the `.env` file.

4. **Build the project**
   ```bash
   npm run build
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
NODE_ENV=development
PORT=5000
API_URL=http://localhost:5000

# MongoDB Configuration
MONGODB_URI=your-mongodb-connection-string

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-super-secret-refresh-key
JWT_REFRESH_EXPIRES_IN=30d

# Session Configuration
SESSION_SECRET=your-super-secret-session-key

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# GitHub OAuth Configuration
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_CALLBACK_URL=http://localhost:5000/api/auth/github/callback

# Email Configuration (Resend)
RESEND_API_KEY=your-resend-api-key
FROM_EMAIL=noreply@codementor.com

# Cloudinary Configuration (optional)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Security
BCRYPT_ROUNDS=12
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `GET /api/auth/verify-email/:token` - Verify email
- `POST /api/auth/resend-verification` - Resend verification email

### OAuth

- `GET /api/auth/google` - Google OAuth login
- `GET /api/auth/google/callback` - Google OAuth callback
- `GET /api/auth/github` - GitHub OAuth login
- `GET /api/auth/github/callback` - GitHub OAuth callback

### Health Check

- `GET /health` - Server health check

## Project Structure

```
src/
├── config/          # Configuration files
│   ├── database.ts  # MongoDB connection
│   └── passport.ts  # Passport.js configuration
├── controllers/     # Route controllers
│   └── authController.ts
├── middleware/      # Custom middleware
│   ├── auth.ts      # Authentication middleware
│   ├── validation.ts # Input validation
│   └── errorHandler.ts # Error handling
├── models/          # Mongoose models
│   ├── User.ts
│   ├── Mentor.ts
│   └── Session.ts
├── routes/          # API routes
│   └── auth.ts
├── services/        # Business logic
├── types/           # TypeScript types
│   └── index.ts
├── utils/           # Utility functions
│   ├── jwt.ts       # JWT utilities
│   ├── email.ts     # Email utilities
│   └── logger.ts    # Logging configuration
└── server.ts        # Main server file
```

## Database Models

### User
- Basic user information
- Authentication details
- Social account links
- Preferences and settings

### Mentor
- Extended user profile for mentors
- Expertise areas
- Availability schedule
- Rating and reviews
- Education and certifications

### Session
- Mentorship sessions
- Scheduling information
- Session status tracking
- Reviews and ratings

## Security Features

- **Password Security**: Bcrypt hashing with configurable rounds
- **JWT Management**: Secure token generation and validation
- **Rate Limiting**: Protection against brute force attacks
- **Input Validation**: Comprehensive request validation
- **CORS Protection**: Configured for frontend integration
- **Security Headers**: Helmet.js for additional security
- **Session Management**: Secure session handling with MongoDB store

## Development

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run clean` - Clean build directory
- `npm run lint` - Run ESLint (if configured)
- `npm test` - Run tests (if configured)

### Code Quality

- TypeScript for type safety
- ESLint for code linting
- Prettier for code formatting
- Comprehensive error handling
- Input validation and sanitization
- Proper logging and monitoring

## Deployment

### Production Considerations

1. **Environment Variables**: Ensure all production environment variables are set
2. **Database**: Use a production MongoDB instance
3. **Security**: Use strong, unique secrets for JWT and sessions
4. **SSL/TLS**: Enable HTTPS in production
5. **Monitoring**: Set up proper logging and monitoring
6. **Backup**: Implement database backup strategies

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist

EXPOSE 5000

CMD ["node", "dist/server.js"]
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the ISC License.

## Support

For support and questions, please contact the development team or create an issue in the repository. 