# AI App Builder - Setup Guide

## Quick Start (5 Minutes)

### Prerequisites Check
Before starting, ensure you have:
- **Node.js 18.0+** - [Download here](https://nodejs.org/)
- **npm 9.0+** - Comes with Node.js
- **Git** - For version control
- **PostgreSQL** - For database (optional for initial development)

### 1. Project Initialization
```bash
# Clone or create project directory
cd "app builder"

# Initialize the frontend Next.js application
cd frontend
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir
```

### 2. Install Dependencies
```bash
# Core dependencies
npm install @tanstack/react-query @prisma/client prisma zod react-hook-form
npm install @heroicons/react clsx tailwind-merge zustand
npm install react-syntax-highlighter @types/react-syntax-highlighter

# Development dependencies  
npm install -D @testing-library/react @testing-library/jest-dom jest jest-environment-jsdom
npm install -D @typescript-eslint/eslint-plugin @typescript-eslint/parser prettier
```

### 3. Environment Setup
```bash
# Create environment file
cp .env.example .env.local

# Add your API keys (get from OpenAI)
echo "OPENAI_API_KEY=your_key_here" >> .env.local
echo "DATABASE_URL=postgresql://localhost:5432/ai_app_builder" >> .env.local
```

### 4. Start Development
```bash
npm run dev
```

Your app will be available at `http://localhost:3000`

## Detailed Setup Instructions

### Development Environment

#### 1. Node.js Setup
```bash
# Check current version
node --version
npm --version

# If you need to update Node.js, use nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

#### 2. Database Setup (PostgreSQL)

**macOS:**
```bash
# Install PostgreSQL
brew install postgresql@15
brew services start postgresql@15

# Create database
createdb ai_app_builder
```

**Windows:**
```bash
# Download and install PostgreSQL from postgresql.org
# Then create database using pgAdmin or command line
psql -U postgres -c "CREATE DATABASE ai_app_builder;"
```

**Linux (Ubuntu):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo -u postgres createdb ai_app_builder
```

#### 3. IDE Setup (VS Code Recommended)

Install these VS Code extensions:
```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "prisma.prisma",
    "ms-vscode.vscode-json"
  ]
}
```

Save this as `.vscode/extensions.json` in your project.

### Project Configuration

#### 1. ESLint Configuration
Create `.eslintrc.json`:
```json
{
  "extends": [
    "next/core-web-vitals",
    "@typescript-eslint/recommended",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "prefer-const": "error",
    "no-console": "warn"
  }
}
```

#### 2. Prettier Configuration
Create `.prettierrc`:
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false
}
```

#### 3. TypeScript Configuration
Update `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/types/*": ["./src/types/*"],
      "@/hooks/*": ["./src/hooks/*"],
      "@/stores/*": ["./src/stores/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

#### 4. Tailwind Configuration
Update `tailwind.config.ts`:
```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
export default config
```

### Project Structure Setup

#### 1. Create Directory Structure
```bash
# Frontend structure
mkdir -p src/app/api/{generate-app,components,projects,integrations}
mkdir -p src/components/{ui,chat,preview,explorer}
mkdir -p src/lib/{components,generators,integrations,utils}
mkdir -p src/lib/components/{ui,layout,features,pages}
mkdir -p src/{hooks,types,stores}
mkdir -p public/{previews,icons}

# Documentation
mkdir -p docs/{components,api,guides}

# Backend services (if separate)
mkdir -p backend/{services,models,utils}
```

#### 2. Package.json Scripts
Update `package.json` scripts:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "type-check": "tsc --noEmit",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:seed": "prisma db seed",
    "format": "prettier --write .",
    "prepare": "husky install"
  }
}
```

### Database Setup (Prisma)

#### 1. Initialize Prisma
```bash
npx prisma init
```

#### 2. Schema Configuration
Create `prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Component {
  id              String            @id @default(cuid())
  name            String
  category        String
  description     String
  code            String
  metadata        Json
  variants        ComponentVariant[]
  dependencies    String[]
  testCoverage    Float
  eslintCompliant Boolean
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  @@map("components")
}

model ComponentVariant {
  id          String    @id @default(cuid())
  componentId String
  component   Component @relation(fields: [componentId], references: [id], onDelete: Cascade)
  name        String
  description String
  code        String
  props       Json
  previewUrl  String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@map("component_variants")
}

model GeneratedProject {
  id              String   @id @default(cuid())
  name            String
  description     String?
  files           Json
  packageJson     Json
  integrations    String[]
  qualityScore    Float
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@map("generated_projects")
}

model Integration {
  id                String   @id @default(cuid())
  name              String   @unique
  template          Json
  dependencies      String[]
  setupInstructions String
  active            Boolean  @default(true)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@map("integrations")
}
```

#### 3. Run Migrations
```bash
npx prisma migrate dev --name init
npx prisma generate
```

### Environment Variables

#### 1. Create Environment Templates
Create `.env.example`:
```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/ai_app_builder"

# AI Service
OPENAI_API_KEY="your_openai_api_key_here"

# Next.js
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your_nextauth_secret_here"

# Optional: Third-party services
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_SECRET_KEY="sk_test_..."
CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

# Optional: Enhanced features
REDIS_URL="redis://localhost:6379"
GITHUB_TOKEN="for_component_updates"
ANALYTICS_KEY="for_usage_tracking"
```

#### 2. Development Environment
Create `.env.local`:
```bash
cp .env.example .env.local
# Edit .env.local with your actual values
```

### Testing Setup

#### 1. Jest Configuration
Create `jest.config.js`:
```javascript
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testEnvironment: 'jest-environment-jsdom',
}

module.exports = createJestConfig(customJestConfig)
```

#### 2. Test Setup
Create `jest.setup.js`:
```javascript
import '@testing-library/jest-dom'
```

### Git Setup

#### 1. Git Configuration
Create `.gitignore`:
```gitignore
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
/coverage/

# Next.js
/.next/
/out/

# Production
/build

# Environment files
.env.local
.env.development.local
.env.test.local
.env.production.local

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# OS
.DS_Store
*.tsbuildinfo

# Database
/prisma/migrations/

# IDE
.vscode/settings.json
```

#### 2. Pre-commit Hooks (Optional)
```bash
npm install -D husky lint-staged
npx husky install
npx husky add .husky/pre-commit "npx lint-staged"
```

Add to `package.json`:
```json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  }
}
```

## Verification Steps

### 1. Environment Check
```bash
# Check Node.js and npm versions
node --version  # Should be 18.0+
npm --version   # Should be 9.0+

# Check database connection
npx prisma db pull  # Should connect successfully
```

### 2. Build and Test
```bash
# Check TypeScript compilation
npm run type-check  # Should pass with no errors

# Check linting
npm run lint  # Should pass with no errors

# Run tests
npm run test  # Should pass all tests

# Test build
npm run build  # Should build successfully
```

### 3. Development Server
```bash
npm run dev
# Visit http://localhost:3000
# Should show the app without errors
```

## Troubleshooting

### Common Issues

#### Node.js Version Issues
```bash
# Use nvm to manage Node versions
nvm install 18
nvm use 18
npm install
```

#### Database Connection Issues
```bash
# Check PostgreSQL is running
brew services list | grep postgresql

# Check database exists
psql -l | grep ai_app_builder

# Reset database if needed
dropdb ai_app_builder
createdb ai_app_builder
npx prisma migrate dev
```

#### ESLint/TypeScript Errors
```bash
# Reset node_modules if needed
rm -rf node_modules package-lock.json
npm install

# Fix auto-fixable issues
npm run lint:fix

# Check for TypeScript issues
npm run type-check
```

#### Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
npm run dev -- -p 3001
```

### Getting Help

1. **Documentation**: Check the docs/ folder for detailed guides
2. **Issues**: Create issues in the project repository
3. **Community**: Join our Discord/Slack for real-time help

## Next Steps

After completing setup:

1. **Start Development**: Follow the implementation plan in `docs/implementation-plan.md`
2. **Build Components**: Begin with Phase 1 - Core Tech Stack & Standards
3. **Read Architecture**: Review `docs/system-architecture.md`
4. **Check Requirements**: See `docs/functional-requirements.md` and `docs/technical-requirements.md`

## Production Deployment

When ready for production, see the deployment guides in:
- `docs/deployment/vercel.md`
- `docs/deployment/aws.md`  
- `docs/deployment/docker.md`

---

**Ready to build the future of app development! 🚀**
