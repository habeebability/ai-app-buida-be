# Backend Deployment Guide

## Environment Variables

To deploy this backend application, you need to configure the following environment variables:

### Required Environment Variables

1. **`MONGODB_URI`** - Your MongoDB connection string
   - Example: `mongodb+srv://username:password@cluster.mongodb.net/ai-app-builder`

2. **`JWT_SECRET`** - Secret key for JWT token signing
   - Generate a strong random string (32+ characters)

3. **`JWT_REFRESH_SECRET`** - Secret key for JWT refresh tokens
   - Generate a different strong random string

4. **`SESSION_SECRET`** - Secret for session management
   - Generate a strong random string

### OAuth Configuration

5. **`GOOGLE_CLIENT_ID`** - Google OAuth client ID
   - Get from [Google Cloud Console](https://console.cloud.google.com/)

6. **`GOOGLE_CLIENT_SECRET`** - Google OAuth client secret
   - Get from [Google Cloud Console](https://console.cloud.google.com/)

7. **`GOOGLE_CALLBACK_URL`** - Google OAuth callback URL
   - **Production**: `https://your-backend-domain.com/api/auth/google/callback`
   - **Development**: `http://localhost:5001/api/auth/google/callback`

8. **`GITHUB_CLIENT_ID`** - GitHub OAuth client ID
   - Get from [GitHub Developer Settings](https://github.com/settings/developers)

9. **`GITHUB_CLIENT_SECRET`** - GitHub OAuth client secret
   - Get from [GitHub Developer Settings](https://github.com/settings/developers)

10. **`GITHUB_CALLBACK_URL`** - GitHub OAuth callback URL
    - **Production**: `https://your-backend-domain.com/api/auth/github/callback`
    - **Development**: `http://localhost:5001/api/auth/github/callback`

### Frontend Integration

11. **`FRONTEND_URL`** - Your frontend application URL
    - **Production**: `https://your-frontend-domain.com`
    - **Development**: `http://localhost:3000`

### Email Configuration (Optional)

12. **`RESEND_API_KEY`** - Resend API key for email functionality
    - Get from [Resend](https://resend.com/)

13. **`FROM_EMAIL`** - Email address for sending emails
    - Example: `noreply@yourdomain.com`

### Security Configuration

14. **`BCRYPT_ROUNDS`** - Number of bcrypt rounds (default: 12)
    - Recommended: 12-14

15. **`AUTH_RATE_LIMIT_MAX`** - Max auth attempts per window (default: 3)

16. **`API_RATE_LIMIT_MAX`** - Max API requests per window (default: 30)

## Setting Up OAuth Providers

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Set **Authorized redirect URIs**:
   - Development: `http://localhost:5001/api/auth/google/callback`
   - Production: `https://your-backend-domain.com/api/auth/google/callback`

### GitHub OAuth Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Set **Authorization callback URL**:
   - Development: `http://localhost:5001/api/auth/github/callback`
   - Production: `https://your-backend-domain.com/api/auth/github/callback`

## Deployment Platforms

### Vercel

1. Connect your repository to Vercel
2. Go to **Settings** → **Environment Variables**
3. Add all required environment variables
4. Set **Build Command**: `npm run build`
5. Set **Output Directory**: `dist`
6. Set **Install Command**: `npm install`

### Railway

1. Connect your repository to Railway
2. Go to **Variables** tab
3. Add all required environment variables
4. Railway will automatically detect and build your Node.js app

### Heroku

1. Connect your repository to Heroku
2. Go to **Settings** → **Config Vars**
3. Add all required environment variables
4. Set **Build Command**: `npm run build`

## Important Notes

- **Never commit environment variables** to your repository
- **Use different OAuth apps** for development and production
- **Update OAuth callback URLs** in provider dashboards when deploying
- **Test OAuth flow** in development before deploying to production
- **Monitor logs** for OAuth errors after deployment

## Troubleshooting

### OAuth Redirect Issues
- Verify callback URLs match exactly in both backend config and OAuth provider settings
- Check that environment variables are set correctly
- Ensure your backend domain is accessible

### Database Connection Issues
- Verify MongoDB URI is correct
- Check network access to your MongoDB cluster
- Ensure database user has proper permissions

### JWT Issues
- Verify JWT secrets are set and are strong random strings
- Check that JWT secrets are different between environments
