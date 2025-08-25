# AI App Builder - Frontend

## Overview
Next.js 14+ application with App Router providing the bolt.new-style chat interface for AI-powered app generation.

## Tech Stack
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Heroicons
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Forms**: React Hook Form + Zod validation

## Project Structure
```
frontend/
├── src/
│   ├── app/                    # App Router pages
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── page.tsx           # Main chat interface
│   │   └── api/               # API routes
│   │       ├── generate-app/
│   │       ├── components/
│   │       └── preview/
│   ├── components/            # React components
│   │   ├── ui/               # Base UI components
│   │   ├── chat/             # Chat interface components
│   │   ├── preview/          # App preview components
│   │   └── explorer/         # Code explorer components
│   ├── lib/                  # Utilities and configurations
│   │   ├── components/       # Component registry
│   │   ├── generators/       # Code generation logic
│   │   ├── integrations/     # Third-party integrations
│   │   └── utils/           # Helper functions
│   ├── hooks/               # Custom React hooks
│   ├── types/               # TypeScript type definitions
│   └── stores/              # Zustand stores
├── public/                  # Static assets
├── package.json
├── tailwind.config.js
├── tsconfig.json
├── next.config.js
└── .eslintrc.json
```

## Key Features

### 1. Chat Interface
- Real-time conversation with AI
- Generation progress tracking
- Message history persistence
- File attachment support

### 2. Code Generation
- Component-based assembly
- ESLint compliant output
- TypeScript validation
- Production-ready code

### 3. Preview System
- Live app preview
- File tree explorer
- Syntax highlighted code viewer
- Project download

### 4. Component Library
- 50+ pre-built components
- Multiple design variants
- Complete with tests and types
- Integration templates

## Getting Started

### Prerequisites
- Node.js 18.0 or higher
- npm 9.0 or higher

### Installation
```bash
cd frontend
npm install
```

### Development
```bash
npm run dev
```

### Build
```bash
npm run build
npm run start
```

### Testing
```bash
npm run test
npm run test:watch
```

### Linting
```bash
npm run lint
npm run lint:fix
```

## Environment Variables
Create a `.env.local` file in the frontend directory:

```bash
# Required for app generation
OPENAI_API_KEY=your_openai_key_here

# Optional: For enhanced features
NEXT_PUBLIC_APP_URL=http://localhost:3000
DATABASE_URL="postgresql://username:password@localhost:5432/ai_app_builder"
```

## Available Scripts
- `dev` - Start development server
- `build` - Build for production
- `start` - Start production server
- `lint` - Run ESLint
- `lint:fix` - Fix ESLint issues
- `test` - Run tests
- `test:watch` - Run tests in watch mode
- `type-check` - Run TypeScript checks

## Architecture

### Component Registry
The component library is organized into categories:
- **UI Components**: Basic interface elements
- **Layout Components**: Page and section layouts  
- **Feature Components**: Complete functionality blocks
- **Page Templates**: Full page implementations

### Code Generation Pipeline
1. **User Input Analysis** - Parse requirements from chat
2. **Component Selection** - AI selects optimal components
3. **Code Assembly** - Generate complete application
4. **Quality Validation** - ESLint, TypeScript, security checks
5. **Output Delivery** - Package for download or preview

### State Management
- **Chat State**: Message history and current conversation
- **Generation State**: Progress tracking and results
- **Project State**: Generated apps and metadata
- **UI State**: Interface preferences and settings
