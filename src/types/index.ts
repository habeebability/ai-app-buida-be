import { Request } from 'express';
import { Document, Types } from 'mongoose';

// User Types
export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  bio?: string;
  role: 'user' | 'admin';
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  socialAccounts: {
    google?: string;
    github?: string;
  };
  preferences: {
    notifications: {
      email: boolean;
      push: boolean;
    };
    privacy: {
      profileVisibility: 'public' | 'private';
      showEmail: boolean;
    };
  };
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateEmailVerificationToken(): string;
  generatePasswordResetToken(): string;
  clearPasswordResetToken(): void;
  clearEmailVerificationToken(): void;
}

// AI App Builder Types

// Project Types
export interface IProject extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  userId: Types.ObjectId;
  status: 'analyzing' | 'selecting' | 'generating' | 'complete' | 'error';
  progress: number;
  currentStep: string;
  userInput: string;
  requirements: {
    features: string[];
    entities: string[];
    integrations: string[];
    complexity: 'simple' | 'medium' | 'complex';
    estimatedComponents: number;
  };
  components: {
    componentId: Types.ObjectId;
    variantId: string;
    customizations: any;
  }[];
  files: {
    path: string;
    content: string;
    type: 'file' | 'directory';
  }[];
  packageJson: any;
  integrations: string[];
  qualityScore: number;
  qualityReport: {
    overall: number;
    checks: {
      name: string;
      score: number;
      passed: boolean;
      details: any;
    }[];
    recommendations: string[];
  };
  previewUrl?: string;
  downloadUrl?: string;
  techStack: {
    framework: string;
    language: string;
    styling: string;
    database: string;
    auth: string;
  };
  stats: {
    totalFiles: number;
    totalSize: number;
    linesOfCode: number;
  };
  isPublic: boolean;
  shareToken?: string;
  error?: {
    message: string;
    stack: string;
    timestamp: Date;
  };
  createdAt: Date;
  updatedAt: Date;
  updateProgress(progress: number, step: string): Promise<IProject>;
  markComplete(): Promise<IProject>;
  markError(error: Error): Promise<IProject>;
  generateShareToken(): Promise<IProject>;
}

// Component Types
export interface IComponentVariant {
  id: string;
  name: string;
  description: string;
  previewImage: string;
  code: {
    component: string;
    styles?: string;
    types?: string;
    tests?: string;
  };
  props: {
    name: string;
    type: string;
    required: boolean;
    description?: string;
    defaultValue?: string;
  }[];
}

export interface IComponent extends Document {
  _id: Types.ObjectId;
  name: string;
  category: 'layout' | 'ui' | 'feature' | 'page' | 'form' | 'navigation' | 'data-display';
  description: string;
  dependencies: string[];
  incompatibleWith: Types.ObjectId[];
  requiredIntegrations: ('auth' | 'database' | 'payments' | 'email' | 'storage' | 'analytics')[];
  complexity: 'simple' | 'medium' | 'complex';
  variants: IComponentVariant[];
  sampleData?: string;
  apiEndpoints: string[];
  eslintCompliant: boolean;
  testCoverage: number;
  usageCount: number;
  tags: string[];
  frameworks: ('nextjs' | 'react' | 'vue' | 'svelte')[];
  version: string;
  author: string;
  status: 'active' | 'deprecated' | 'beta';
  performance: {
    bundleSize?: number;
    renderTime?: number;
  };
  accessibility: {
    score: number;
    issues: string[];
  };
  createdAt: Date;
  updatedAt: Date;
  incrementUsage(): Promise<IComponent>;
  addVariant(variant: IComponentVariant): Promise<IComponent>;
  updateVariant(variantId: string, updates: any): Promise<IComponent>;
}

// Chat Types
export interface IChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata: {
    tokens?: number;
    processingTime?: number;
    model?: string;
  };
  attachments: {
    type: 'image' | 'file' | 'code';
    url?: string;
    name?: string;
    size?: number;
  }[];
}

export interface IChat extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  projectId?: Types.ObjectId;
  title: string;
  messages: IChatMessage[];
  status: 'active' | 'archived' | 'completed';
  context: {
    currentIntent?: string;
    lastUserInput?: string;
    projectRequirements: {
      features: string[];
      integrations: string[];
      complexity?: string;
    };
    selectedComponents: string[];
    generationState: {
      step?: string;
      progress?: number;
      errors: string[];
    };
  };
  stats: {
    messageCount: number;
    totalTokens: number;
    avgResponseTime: number;
  };
  preferences: {
    autoSave: boolean;
    notifications: boolean;
  };
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
  addMessage(message: {
    role: 'user' | 'assistant' | 'system';
    content: string;
    metadata?: any;
    attachments?: any[];
  }): Promise<IChat>;
  updateContext(updates: any): Promise<IChat>;
  archive(): Promise<IChat>;
  markCompleted(): Promise<IChat>;
  getConversationHistory(limit?: number): { role: string; content: string; }[];
}

// Integration Types
export interface IIntegration extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description: string;
  category: 'auth' | 'database' | 'payments' | 'email' | 'storage' | 'analytics' | 'ui' | 'api';
  provider: string;
  logo: string;
  dependencies: {
    name: string;
    version: string;
    type: 'dependencies' | 'devDependencies';
  }[];
  envVars: {
    name: string;
    description?: string;
    required: boolean;
    defaultValue?: string;
    sensitive: boolean;
  }[];
  files: {
    path: string;
    content: string;
    operation: 'create' | 'update' | 'append';
    description?: string;
  }[];
  setupInstructions: string;
  configSchema: any;
  tags: string[];
  compatibility: {
    frameworks: ('nextjs' | 'react' | 'vue' | 'svelte')[];
    versions: {
      node?: string;
      npm?: string;
    };
  };
  pricing: {
    free: boolean;
    plans: {
      name?: string;
      price?: string;
      features: string[];
    }[];
  };
  documentation: {
    official?: string;
    tutorial?: string;
    examples: string[];
  };
  status: 'active' | 'beta' | 'deprecated' | 'coming-soon';
  complexity: 'simple' | 'medium' | 'complex';
  usageCount: number;
  rating: {
    average: number;
    count: number;
  };
  testEndpoint?: string;
  testInstructions?: string;
  version: string;
  author: string;
  featured: boolean;
  createdAt: Date;
  updatedAt: Date;
  incrementUsage(): Promise<IIntegration>;
  addRating(rating: number): Promise<IIntegration>;
  validateConfig(config: any): { valid: boolean; errors?: string[]; };
}

// Request Types
export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

// Auth Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface VerifyEmailRequest {
  token: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// JWT Payload
export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

// Social Auth Types
export interface GoogleProfile {
  id: string;
  displayName: string;
  name: {
    familyName: string;
    givenName: string;
  };
  emails: Array<{
    value: string;
    verified: boolean;
  }>;
  photos: Array<{
    value: string;
  }>;
}

export interface GitHubProfile {
  id: string;
  username: string;
  displayName: string;
  emails: Array<{
    value: string;
    verified: boolean;
  }>;
  photos: Array<{
    value: string;
  }>;
}

// Email Types
export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

// File Upload Types
export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}

// Validation Types
export interface ValidationError {
  field: string;
  message: string;
}

// AI App Builder Request Types
export interface GenerateAppRequest {
  userInput: string;
  preferences?: {
    framework?: string;
    auth?: string;
    database?: string;
    payments?: string;
    styling?: string;
  };
}

export interface AnalyzeRequirementsRequest {
  userInput: string;
}

export interface SelectComponentsRequest {
  requirements: {
    features: string[];
    entities: string[];
    integrations: string[];
    complexity: 'simple' | 'medium' | 'complex';
  };
}

export interface ChatMessageRequest {
  message: string;
  chatId?: string;
  projectId?: string;
}

export interface ComponentSearchRequest {
  query?: string;
  category?: string;
  complexity?: string;
  tags?: string[];
  limit?: number;
}

export interface IntegrationSearchRequest {
  query?: string;
  category?: string;
  complexity?: string;
  free?: boolean;
  limit?: number;
}

// AI Service Types
export interface RequirementAnalysis {
  features: string[];
  entities: string[];
  integrations: string[];
  complexity: 'simple' | 'medium' | 'complex';
  estimatedComponents: number;
  reasoning: string;
}

export interface ComponentSelection {
  components: {
    componentId: string;
    variantId: string;
    reasoning: string;
    customizations?: any;
  }[];
  pageStructure: {
    pages: string[];
    layouts: string[];
    routing: any;
  };
  requiredIntegrations: string[];
  sampleData: Record<string, any[]>;
  reasoning: string;
}

export interface GeneratedFile {
  path: string;
  content: string;
  type: 'file' | 'directory';
}

export interface GeneratedProject {
  id: string;
  name: string;
  files: GeneratedFile[];
  packageJson: any;
  setupInstructions: string;
  qualityScore: number;
  integrations: string[];
  techStack: {
    framework: string;
    language: string;
    styling: string;
    database?: string;
    auth?: string;
  };
}

export interface QualityCheck {
  name: string;
  score: number;
  passed: boolean;
  details: any;
}

export interface QualityReport {
  overall: number;
  checks: QualityCheck[];
  recommendations: string[];
}

// Search and Filter Types
export interface ComponentFilters {
  category?: string;
  complexity?: string;
  tags?: string[];
  frameworks?: string[];
  status?: string;
}

export interface IntegrationFilters {
  category?: string;
  complexity?: string;
  free?: boolean;
  featured?: boolean;
  status?: string;
}

export interface ProjectFilters {
  status?: string;
  complexity?: string;
  isPublic?: boolean;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}
