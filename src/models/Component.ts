import mongoose, { Schema, Document } from 'mongoose';
import { IComponent } from '../types';

const componentVariantSchema = new Schema({
  id: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  previewImage: {
    type: String,
    required: true,
  },
  code: {
    component: {
      type: String,
      required: true,
    },
    styles: String,
    types: String,
    tests: String,
  },
  props: [{
    name: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    required: {
      type: Boolean,
      default: false,
    },
    description: String,
    defaultValue: String,
  }],
});

const componentSchema = new Schema<IComponent>(
  {
    name: {
      type: String,
      required: [true, 'Component name is required'],
      trim: true,
      maxlength: [100, 'Component name cannot exceed 100 characters'],
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Component category is required'],
      enum: ['layout', 'ui', 'feature', 'page', 'form', 'navigation', 'data-display'],
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Component description is required'],
      maxlength: [500, 'Component description cannot exceed 500 characters'],
      trim: true,
    },
    // Dependencies required by this component
    dependencies: [{
      type: String,
      trim: true,
    }],
    // Components that cannot be used together with this one
    incompatibleWith: [{
      type: Schema.Types.ObjectId,
      ref: 'Component',
    }],
    // Required integrations (auth, database, payments, etc.)
    requiredIntegrations: [{
      type: String,
      enum: ['auth', 'database', 'payments', 'email', 'storage', 'analytics'],
    }],
    // Complexity level
    complexity: {
      type: String,
      enum: ['simple', 'medium', 'complex'],
      required: true,
      index: true,
    },
    // Different variants of this component
    variants: [componentVariantSchema],
    // Sample data for this component
    sampleData: String,
    // API endpoints this component might need
    apiEndpoints: [String],
    // Code quality metrics
    eslintCompliant: {
      type: Boolean,
      default: true,
      index: true,
    },
    testCoverage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    // Usage statistics
    usageCount: {
      type: Number,
      default: 0,
      index: true,
    },
    // Tags for better searchability
    tags: [{
      type: String,
      trim: true,
      lowercase: true,
    }],
    // Framework compatibility
    frameworks: [{
      type: String,
      enum: ['nextjs', 'react', 'vue', 'svelte'],
      default: 'nextjs',
    }],
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
    // Component status
    status: {
      type: String,
      enum: ['active', 'deprecated', 'beta'],
      default: 'active',
    },
    // Performance metrics
    performance: {
      bundleSize: Number, // in bytes
      renderTime: Number, // in milliseconds
    },
    // SEO and accessibility
    accessibility: {
      score: {
        type: Number,
        min: 0,
        max: 100,
        default: 100,
      },
      issues: [String],
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
componentSchema.index({ category: 1, status: 1 });
componentSchema.index({ tags: 1, status: 1 });
componentSchema.index({ usageCount: -1, status: 1 });
componentSchema.index({ complexity: 1, category: 1 });

// Text index for search
componentSchema.index({
  name: 'text',
  description: 'text',
  tags: 'text',
});

// Method to increment usage count
componentSchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  return this.save();
};

// Method to add a new variant
componentSchema.methods.addVariant = function(variant: any) {
  this.variants.push(variant);
  return this.save();
};

// Method to update variant
componentSchema.methods.updateVariant = function(variantId: string, updates: any) {
  const variant = this.variants.find((v: any) => v.id === variantId);
  if (variant) {
    Object.assign(variant, updates);
    return this.save();
  }
  throw new Error('Variant not found');
};

// Static method to search components
componentSchema.statics.searchComponents = function(
  query: string, 
  filters: { category?: string; complexity?: string; tags?: string[] } = {}
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
  
  if (filters.tags && filters.tags.length > 0) {
    searchQuery.tags = { $in: filters.tags };
  }
  
  return this.find(searchQuery)
    .sort({ score: { $meta: 'textScore' }, usageCount: -1 })
    .limit(50);
};

// Static method to find compatible components
componentSchema.statics.findCompatible = function(selectedComponentIds: string[]) {
  return this.find({
    status: 'active',
    _id: { $nin: selectedComponentIds },
    incompatibleWith: { $nin: selectedComponentIds },
  });
};

// Static method to find by category
componentSchema.statics.findByCategory = function(category: string, limit: number = 20) {
  return this.find({ category, status: 'active' })
    .sort({ usageCount: -1 })
    .limit(limit);
};

// Static method to get popular components
componentSchema.statics.getPopular = function(limit: number = 10) {
  return this.find({ status: 'active' })
    .sort({ usageCount: -1 })
    .limit(limit)
    .select('name category description usageCount variants.0.previewImage');
};

// Static method to find components for specific requirements
componentSchema.statics.findForRequirements = function(requirements: {
  features: string[];
  integrations: string[];
  complexity: string;
}) {
  const query: any = { status: 'active' };
  
  // Match based on tags that might relate to features
  if (requirements.features.length > 0) {
    query.tags = { $in: requirements.features.map(f => f.toLowerCase()) };
  }
  
  // Match required integrations
  if (requirements.integrations.length > 0) {
    query.requiredIntegrations = { $in: requirements.integrations };
  }
  
  // Filter by complexity
  if (requirements.complexity === 'simple') {
    query.complexity = { $in: ['simple'] };
  } else if (requirements.complexity === 'medium') {
    query.complexity = { $in: ['simple', 'medium'] };
  }
  // For complex, allow all complexities
  
  return this.find(query).sort({ usageCount: -1 });
};

// Pre-save middleware to validate variants
componentSchema.pre('save', function(next) {
  if (this.variants && this.variants.length === 0) {
    next(new Error('Component must have at least one variant'));
  } else {
    next();
  }
});

const Component = mongoose.model<IComponent>('Component', componentSchema);

export default Component;
