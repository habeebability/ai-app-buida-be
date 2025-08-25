import mongoose, { Schema, Document } from 'mongoose';
import { IProject } from '../types';

const projectSchema = new Schema<IProject>(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      maxlength: [100, 'Project name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      maxlength: [500, 'Project description cannot exceed 500 characters'],
      trim: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    status: {
      type: String,
      enum: ['analyzing', 'selecting', 'generating', 'complete', 'error'],
      default: 'analyzing',
      index: true,
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    currentStep: {
      type: String,
      default: '',
    },
    // Original user input
    userInput: {
      type: String,
      required: [true, 'User input is required'],
      maxlength: [2000, 'User input cannot exceed 2000 characters'],
    },
    // Requirements analysis result
    requirements: {
      features: [String],
      entities: [String],
      integrations: [String],
      complexity: {
        type: String,
        enum: ['simple', 'medium', 'complex'],
      },
      estimatedComponents: {
        type: Number,
        min: 0,
      },
    },
    // Selected components
    components: [{
      componentId: {
        type: Schema.Types.ObjectId,
        ref: 'Component',
        required: true,
      },
      variantId: String,
      customizations: Schema.Types.Mixed,
    }],
    // Generated project structure
    files: [{
      path: {
        type: String,
        required: true,
      },
      content: {
        type: String,
        required: true,
      },
      type: {
        type: String,
        enum: ['file', 'directory'],
        default: 'file',
      },
    }],
    // Package.json content
    packageJson: Schema.Types.Mixed,
    // Required integrations
    integrations: [String],
    // Quality metrics
    qualityScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    qualityReport: {
      overall: Number,
      checks: [{
        name: String,
        score: Number,
        passed: Boolean,
        details: Schema.Types.Mixed,
      }],
      recommendations: [String],
    },
    // Preview and download URLs
    previewUrl: String,
    downloadUrl: String,
    // Project metadata
    techStack: {
      framework: String,
      language: String,
      styling: String,
      database: String,
      auth: String,
    },
    // File sizes and project stats
    stats: {
      totalFiles: {
        type: Number,
        default: 0,
      },
      totalSize: {
        type: Number, // in bytes
        default: 0,
      },
      linesOfCode: {
        type: Number,
        default: 0,
      },
    },
    // Sharing settings
    isPublic: {
      type: Boolean,
      default: false,
    },
    shareToken: String,
    // Error information
    error: {
      message: String,
      stack: String,
      timestamp: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function(doc, ret) {
        // Don't expose internal fields
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
projectSchema.index({ userId: 1, createdAt: -1 });
projectSchema.index({ status: 1 });
projectSchema.index({ isPublic: 1, createdAt: -1 });
projectSchema.index({ shareToken: 1 }, { sparse: true });
projectSchema.index({ 'requirements.complexity': 1 });

// Virtual for project size in MB
projectSchema.virtual('sizeInMB').get(function(this: IProject) {
  return this.stats?.totalSize ? (this.stats.totalSize / (1024 * 1024)).toFixed(2) : '0';
});

// Method to update progress
projectSchema.methods.updateProgress = function(progress: number, step: string) {
  this.progress = Math.min(100, Math.max(0, progress));
  this.currentStep = step;
  return this.save();
};

// Method to mark as complete
projectSchema.methods.markComplete = function() {
  this.status = 'complete';
  this.progress = 100;
  this.currentStep = 'Complete';
  return this.save();
};

// Method to mark as error
projectSchema.methods.markError = function(error: Error) {
  this.status = 'error';
  this.error = {
    message: error.message,
    stack: error.stack,
    timestamp: new Date(),
  };
  return this.save();
};

// Method to generate share token
projectSchema.methods.generateShareToken = function() {
  const crypto = require('crypto');
  this.shareToken = crypto.randomBytes(32).toString('hex');
  return this.save();
};

// Static method to find user's projects
projectSchema.statics.findByUserId = function(userId: string, limit: number = 20) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('components.componentId', 'name category');
};

// Static method to find public projects
projectSchema.statics.findPublic = function(limit: number = 20) {
  return this.find({ isPublic: true, status: 'complete' })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('name description requirements stats qualityScore createdAt')
    .populate('userId', 'firstName lastName avatar');
};

// Static method to find by share token
projectSchema.statics.findByShareToken = function(shareToken: string) {
  return this.findOne({ shareToken, status: 'complete' })
    .populate('userId', 'firstName lastName avatar')
    .populate('components.componentId', 'name category');
};

// Pre-save middleware to calculate stats
projectSchema.pre('save', function(next) {
  if (this.files && this.files.length > 0) {
    this.stats = this.stats || {};
    this.stats.totalFiles = this.files.filter(f => f.type === 'file').length;
    this.stats.totalSize = this.files.reduce((size, file) => {
      return size + (file.type === 'file' ? Buffer.byteLength(file.content, 'utf8') : 0);
    }, 0);
    this.stats.linesOfCode = this.files.reduce((lines, file) => {
      return lines + (file.type === 'file' ? file.content.split('\n').length : 0);
    }, 0);
  }
  next();
});

const Project = mongoose.model<IProject>('Project', projectSchema);

export default Project;
