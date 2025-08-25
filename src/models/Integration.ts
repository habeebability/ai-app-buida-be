import mongoose, { Schema, Document } from 'mongoose';
import { IIntegration } from '../types';

const integrationSchema = new Schema<IIntegration>(
  {
    name: {
      type: String,
      required: [true, 'Integration name is required'],
      trim: true,
      unique: true,
      maxlength: [100, 'Integration name cannot exceed 100 characters'],
      index: true,
    },
    slug: {
      type: String,
      required: [true, 'Integration slug is required'],
      unique: true,
      lowercase: true,
      match: [/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'],
    },
    description: {
      type: String,
      required: [true, 'Integration description is required'],
      maxlength: [500, 'Integration description cannot exceed 500 characters'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Integration category is required'],
      enum: ['auth', 'database', 'payments', 'email', 'storage', 'analytics', 'ui', 'api'],
      index: true,
    },
    // Integration provider (e.g., 'stripe', 'clerk', 'prisma')
    provider: {
      type: String,
      required: [true, 'Integration provider is required'],
      trim: true,
    },
    // Logo/icon for the integration
    logo: {
      type: String,
      required: true,
    },
    // Required dependencies
    dependencies: [{
      name: {
        type: String,
        required: true,
      },
      version: {
        type: String,
        required: true,
      },
      type: {
        type: String,
        enum: ['dependencies', 'devDependencies'],
        default: 'dependencies',
      },
    }],
    // Environment variables needed
    envVars: [{
      name: {
        type: String,
        required: true,
      },
      description: String,
      required: {
        type: Boolean,
        default: true,
      },
      defaultValue: String,
      sensitive: {
        type: Boolean,
        default: false,
      },
    }],
    // Files to be generated/modified
    files: [{
      path: {
        type: String,
        required: true,
      },
      content: {
        type: String,
        required: true,
      },
      operation: {
        type: String,
        enum: ['create', 'update', 'append'],
        default: 'create',
      },
      description: String,
    }],
    // Setup instructions markdown
    setupInstructions: {
      type: String,
      required: [true, 'Setup instructions are required'],
    },
    // Configuration schema (for validation)
    configSchema: Schema.Types.Mixed,
    // Integration tags
    tags: [{
      type: String,
      trim: true,
      lowercase: true,
    }],
    // Compatibility information
    compatibility: {
      frameworks: [{
        type: String,
        enum: ['nextjs', 'react', 'vue', 'svelte'],
      }],
      versions: {
        node: String,
        npm: String,
      },
    },
    // Pricing information
    pricing: {
      free: {
        type: Boolean,
        default: true,
      },
      plans: [{
        name: String,
        price: String,
        features: [String],
      }],
    },
    // Documentation links
    documentation: {
      official: String,
      tutorial: String,
      examples: [String],
    },
    // Integration status
    status: {
      type: String,
      enum: ['active', 'beta', 'deprecated', 'coming-soon'],
      default: 'active',
    },
    // Complexity level
    complexity: {
      type: String,
      enum: ['simple', 'medium', 'complex'],
      required: true,
    },
    // Usage statistics
    usageCount: {
      type: Number,
      default: 0,
      index: true,
    },
    // Ratings and reviews
    rating: {
      average: {
        type: Number,
        min: 0,
        max: 5,
        default: 0,
      },
      count: {
        type: Number,
        default: 0,
      },
    },
    // Testing configuration
    testEndpoint: String,
    testInstructions: String,
    // Version information
    version: {
      type: String,
      default: '1.0.0',
    },
    // Author information
    author: {
      type: String,
      default: 'AI App Builder Team',
    },
    // Featured status
    featured: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound indexes
integrationSchema.index({ category: 1, status: 1 });
integrationSchema.index({ featured: 1, usageCount: -1 });
integrationSchema.index({ status: 1, usageCount: -1 });

// Text index for search
integrationSchema.index({
  name: 'text',
  description: 'text',
  provider: 'text',
  tags: 'text',
});

// Method to increment usage count
integrationSchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  return this.save();
};

// Method to add a rating
integrationSchema.methods.addRating = function(rating: number) {
  const totalRating = this.rating.average * this.rating.count;
  this.rating.count += 1;
  this.rating.average = (totalRating + rating) / this.rating.count;
  return this.save();
};

// Method to validate configuration
integrationSchema.methods.validateConfig = function(config: any) {
  if (!this.configSchema) return { valid: true };
  
  // Here you would implement JSON schema validation
  // For now, just return valid
  return { valid: true };
};

// Static method to find by category
integrationSchema.statics.findByCategory = function(category: string, limit: number = 20) {
  return this.find({ category, status: 'active' })
    .sort({ usageCount: -1 })
    .limit(limit);
};

// Static method to search integrations
integrationSchema.statics.searchIntegrations = function(
  query: string,
  filters: { category?: string; complexity?: string; free?: boolean } = {}
) {
  const searchQuery: any = { status: 'active' };
  
  if (query) {
    searchQuery.$text = { $search: query };
  }
  
  if (filters.category) {
    searchQuery.category = filters.category;
  }
  
  if (filters.complexity) {
    searchQuery.complexity = filters.complexity;
  }
  
  if (filters.free !== undefined) {
    searchQuery['pricing.free'] = filters.free;
  }
  
  return this.find(searchQuery)
    .sort({ score: { $meta: 'textScore' }, usageCount: -1 })
    .limit(50);
};

// Static method to get featured integrations
integrationSchema.statics.getFeatured = function(limit: number = 6) {
  return this.find({ featured: true, status: 'active' })
    .sort({ usageCount: -1 })
    .limit(limit)
    .select('name description logo category provider rating usageCount');
};

// Static method to get popular integrations
integrationSchema.statics.getPopular = function(limit: number = 10) {
  return this.find({ status: 'active' })
    .sort({ usageCount: -1 })
    .limit(limit)
    .select('name description logo category provider rating usageCount');
};

// Static method to find compatible integrations
integrationSchema.statics.findCompatible = function(framework: string, complexity?: string) {
  const query: any = {
    status: 'active',
    'compatibility.frameworks': framework,
  };
  
  if (complexity) {
    if (complexity === 'simple') {
      query.complexity = { $in: ['simple'] };
    } else if (complexity === 'medium') {
      query.complexity = { $in: ['simple', 'medium'] };
    }
    // For complex, allow all complexities
  }
  
  return this.find(query).sort({ usageCount: -1 });
};

// Static method to find by requirements
integrationSchema.statics.findByRequirements = function(requirements: string[]) {
  return this.find({
    status: 'active',
    category: { $in: requirements },
  }).sort({ usageCount: -1 });
};

// Pre-save middleware to generate slug from name
integrationSchema.pre('save', function(next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim();
  }
  next();
});

// Pre-save middleware to validate environment variables
integrationSchema.pre('save', function(next) {
  // Validate that all required env vars have names
  const invalidEnvVars = this.envVars.filter(envVar => !envVar.name || envVar.name.trim() === '');
  if (invalidEnvVars.length > 0) {
    next(new Error('All environment variables must have a name'));
  } else {
    next();
  }
});

const Integration = mongoose.model<IIntegration>('Integration', integrationSchema);

export default Integration;
