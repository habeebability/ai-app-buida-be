# AI App Builder - Backend

## Overview
The backend API for the AI App Builder - a revolutionary platform that generates production-ready Next.js applications from natural language descriptions. Built with Express.js and TypeScript, providing robust authentication, project management, and AI-powered code generation.

## Architecture
The backend is implemented as a standalone Express.js API server that provides:
- **Authentication & User Management**: JWT-based auth with social login support
- **AI-Powered Generation**: Intelligent analysis and code generation
- **Component Registry**: Pre-built, battle-tested component library
- **Project Management**: Full CRUD operations for generated projects
- **Real-time Chat**: Conversational interface for iterative development

## API Routes Structure

### Core Generation APIs
```
/api/
├── generate-app/           # Main app generation endpoint
│   └── route.ts           # POST: Generate complete application
├── analyze-requirements/   # Requirement analysis
│   └── route.ts           # POST: Parse user input
├── select-components/      # Component selection
│   └── route.ts           # POST: AI component selection
└── validate-code/         # Code quality validation
    └── route.ts           # POST: ESLint/TypeScript validation
```

### Component Management APIs
```
/api/components/
├── registry/              # Component registry management
│   ├── route.ts          # GET: List components, POST: Add component
│   └── [id]/route.ts     # GET/PUT/DELETE: Component CRUD
├── search/               # Component search
│   └── route.ts          # GET: Search components by criteria
└── preview/              # Component preview
    └── [id]/route.ts     # GET: Component preview data
```

### Integration Management APIs
```
/api/integrations/
├── available/            # List available integrations
│   └── route.ts          # GET: Available integration templates
├── setup/                # Integration setup
│   └── [integration]/route.ts  # POST: Configure integration
└── validate/             # Integration validation
    └── [integration]/route.ts  # POST: Test integration
```

### Project Management APIs
```
/api/projects/
├── route.ts              # GET: List projects, POST: Create project
├── [id]/                 # Project operations
│   ├── route.ts          # GET/PUT/DELETE: Project CRUD
│   ├── download/route.ts # GET: Download project zip
│   ├── preview/route.ts  # GET: Project preview
│   └── files/            # Project files
│       └── route.ts      # GET: List project files
```

## Core Services

### 1. Requirement Analyzer
```typescript
interface RequirementAnalysis {
  features: string[];
  entities: string[];
  integrations: string[];
  complexity: 'simple' | 'medium' | 'complex';
  estimatedComponents: number;
}

class RequirementAnalyzer {
  async analyzeUserInput(input: string): Promise<RequirementAnalysis>
  private extractFeatures(input: string): string[]
  private extractEntities(input: string): string[]
  private determineComplexity(features: string[]): string
}
```

### 2. Component Selector
```typescript
interface ComponentSelection {
  components: SelectedComponent[];
  pageStructure: AppRouterStructure;
  requiredIntegrations: string[];
  sampleData: Record<string, any[]>;
  reasoning: string;
}

class ComponentSelector {
  async selectComponents(analysis: RequirementAnalysis): Promise<ComponentSelection>
  private filterByCompatibility(components: Component[]): Component[]
  private optimizeSelection(components: Component[]): Component[]
  private generateAppRouterStructure(components: Component[]): AppRouterStructure
}
```

### 3. Code Generator
```typescript
interface GeneratedProject {
  id: string;
  name: string;
  files: GeneratedFile[];
  packageJson: PackageJson;
  setupInstructions: string;
  qualityScore: number;
  integrations: string[];
}

class CodeGenerator {
  async generateProject(selection: ComponentSelection): Promise<GeneratedProject>
  private generateAllFiles(selection: ComponentSelection): Promise<GeneratedFile[]>
  private lintAndFixFiles(files: GeneratedFile[]): Promise<GeneratedFile[]>
  private runTypeChecking(files: GeneratedFile[]): Promise<GeneratedFile[]>
}
```

### 4. Quality Assurance System
```typescript
interface QualityReport {
  overall: number;
  checks: QualityCheck[];
  recommendations: string[];
}

interface QualityCheck {
  name: string;
  score: number;
  passed: boolean;
  details: any;
}

class QualityAssuranceSystem {
  async validateProject(project: GeneratedProject): Promise<QualityReport>
  private runESLintChecks(project: GeneratedProject): Promise<QualityCheck>
  private runSecurityChecks(project: GeneratedProject): Promise<QualityCheck>
  private runPerformanceChecks(project: GeneratedProject): Promise<QualityCheck>
}
```

### 5. Integration Manager
```typescript
interface IntegrationTemplate {
  id: string;
  name: string;
  dependencies: string[];
  envVars: Record<string, string>;
  files: Record<string, string>;
  setupInstructions: string;
}

class IntegrationManager {
  async applyIntegration(
    project: GeneratedProject, 
    integration: string,
    config?: Record<string, any>
  ): Promise<GeneratedProject>
  
  private addDependencies(packageJson: PackageJson, deps: string[]): PackageJson
  private generateEnvTemplate(envVars: Record<string, string>): string
}
```

## Database Schema (Prisma)

### Core Models
```prisma
model Component {
  id              String   @id @default(cuid())
  name            String
  category        String
  description     String
  code            String
  metadata        Json
  variants        ComponentVariant[]
  dependencies    String[]
  testCoverage    Float
  eslintCompliant Boolean
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model ComponentVariant {
  id          String    @id @default(cuid())
  componentId String
  component   Component @relation(fields: [componentId], references: [id])
  name        String
  description String
  code        String
  props       Json
  previewUrl  String?
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
}

model Integration {
  id               String   @id @default(cuid())
  name             String
  template         Json
  dependencies     String[]
  setupInstructions String
  active           Boolean  @default(true)
}
```

## Environment Variables

### Required
```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/ai_app_builder"

# AI/LLM Service
OPENAI_API_KEY="your_openai_api_key"

# App Configuration
NODE_ENV="development"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your_nextauth_secret"
```

### Optional
```bash
# Enhanced Features
REDIS_URL="redis://localhost:6379"
GITHUB_TOKEN="for_component_updates"
ANALYTICS_KEY="for_usage_tracking"
```

## API Request/Response Examples

### Generate App
```typescript
// POST /api/generate-app
{
  "userInput": "I want to build a SaaS dashboard for project management",
  "preferences": {
    "auth": "clerk",
    "database": "postgresql",
    "payments": "stripe"
  }
}

// Response
{
  "projectId": "proj_abc123",
  "status": "generating",
  "estimatedTime": 25,
  "components": ["dashboard-layout", "auth-forms", "data-table"],
  "integrations": ["clerk", "prisma", "stripe"]
}
```

### Get Generation Status
```typescript
// GET /api/projects/proj_abc123
{
  "id": "proj_abc123",
  "status": "complete",
  "progress": 100,
  "files": 24,
  "qualityScore": 95,
  "downloadUrl": "/api/projects/proj_abc123/download",
  "previewUrl": "/api/projects/proj_abc123/preview"
}
```

### Component Search
```typescript
// GET /api/components/search?category=ui&features=authentication
{
  "components": [
    {
      "id": "auth-form-modern",
      "name": "Modern Auth Form",
      "category": "ui",
      "variants": 3,
      "quality": 95,
      "previewUrl": "/previews/auth-form-modern.png"
    }
  ],
  "total": 12,
  "page": 1
}
```

## Development Setup

### 1. Database Setup
```bash
# Install and start PostgreSQL
brew install postgresql
brew services start postgresql

# Create database
createdb ai_app_builder

# Run migrations
npx prisma migrate dev
```

### 2. Environment Configuration
```bash
# Copy environment template
cp .env.example .env.local

# Add your API keys and database URL
```

### 3. Seed Database
```bash
# Seed with initial components and integrations
npx prisma db seed
```

## Testing

### Unit Tests
```bash
npm run test
npm run test:watch
npm run test:coverage
```

### Integration Tests
```bash
npm run test:integration
```

### API Tests
```bash
npm run test:api
```

## Deployment

### Production Build
```bash
npm run build
npm run start
```

### Database Migration
```bash
npx prisma migrate deploy
```

### Environment Variables (Production)
Ensure all required environment variables are set in your deployment environment.

## Performance Considerations

### Caching Strategy
- Component registry cached in Redis
- Generated projects cached for 24 hours
- API responses cached appropriately

### Database Optimization
- Indexed component searches
- Efficient query patterns
- Connection pooling

### File Generation
- Streaming responses for large projects
- Parallel code generation
- Optimized ESLint processing

## Security

### Input Validation
- All user inputs validated with Zod schemas
- SQL injection prevention via Prisma ORM
- XSS protection for generated code

### Code Generation Security
- No eval() in generated code
- Sanitized component templates
- Secure environment variable handling

### API Security
- Rate limiting on generation endpoints
- Authentication for project management
- CORS configuration
