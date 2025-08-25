import mongoose, { Schema, Document } from 'mongoose';
import { IChat } from '../types';

const messageSchema = new Schema({
  id: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true,
  },
  content: {
    type: String,
    required: true,
    maxlength: [5000, 'Message content cannot exceed 5000 characters'],
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  // Additional metadata for messages
  metadata: {
    tokens: Number, // Token count for this message
    processingTime: Number, // Time taken to generate response (for assistant messages)
    model: String, // AI model used (for assistant messages)
  },
  // For file attachments or images
  attachments: [{
    type: {
      type: String,
      enum: ['image', 'file', 'code'],
    },
    url: String,
    name: String,
    size: Number,
  }],
});

const chatSchema = new Schema<IChat>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
    },
    title: {
      type: String,
      required: [true, 'Chat title is required'],
      trim: true,
      maxlength: [200, 'Chat title cannot exceed 200 characters'],
    },
    messages: [messageSchema],
    // Chat status
    status: {
      type: String,
      enum: ['active', 'archived', 'completed'],
      default: 'active',
    },
    // Context for maintaining conversation state
    context: {
      currentIntent: String, // What the user is trying to achieve
      lastUserInput: String, // Last user message for quick reference
      projectRequirements: {
        features: [String],
        integrations: [String],
        complexity: String,
      },
      selectedComponents: [String], // IDs of components discussed/selected
      generationState: {
        step: String,
        progress: Number,
        errors: [String],
      },
    },
    // Statistics
    stats: {
      messageCount: {
        type: Number,
        default: 0,
      },
      totalTokens: {
        type: Number,
        default: 0,
      },
      avgResponseTime: {
        type: Number, // in milliseconds
        default: 0,
      },
    },
    // Chat preferences
    preferences: {
      autoSave: {
        type: Boolean,
        default: true,
      },
      notifications: {
        type: Boolean,
        default: true,
      },
    },
    // Last activity timestamp
    lastActivityAt: {
      type: Date,
      default: Date.now,
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

// Indexes
chatSchema.index({ userId: 1, lastActivityAt: -1 });
chatSchema.index({ projectId: 1 });
chatSchema.index({ status: 1, lastActivityAt: -1 });
chatSchema.index({ 'context.currentIntent': 1 });

// Virtual for latest message
chatSchema.virtual('latestMessage').get(function(this: IChat) {
  return this.messages && this.messages.length > 0 
    ? this.messages[this.messages.length - 1] 
    : null;
});

// Method to add a message
chatSchema.methods.addMessage = function(message: {
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: any;
  attachments?: any[];
}) {
  const newMessage = {
    id: new mongoose.Types.ObjectId().toString(),
    role: message.role,
    content: message.content,
    timestamp: new Date(),
    metadata: message.metadata || {},
    attachments: message.attachments || [],
  };

  this.messages.push(newMessage);
  this.stats.messageCount = this.messages.length;
  this.lastActivityAt = new Date();

  // Update token count if provided
  if (message.metadata?.tokens) {
    this.stats.totalTokens += message.metadata.tokens;
  }

  // Update average response time for assistant messages
  if (message.role === 'assistant' && message.metadata?.processingTime) {
    const assistantMessages = this.messages.filter((m: any) => m.role === 'assistant');
    const totalTime = assistantMessages.reduce((sum: number, m: any) => sum + (m.metadata?.processingTime || 0), 0);
    this.stats.avgResponseTime = totalTime / assistantMessages.length;
  }

  return this.save();
};

// Method to update context
chatSchema.methods.updateContext = function(updates: any) {
  this.context = { ...this.context, ...updates };
  this.lastActivityAt = new Date();
  return this.save();
};

// Method to archive chat
chatSchema.methods.archive = function() {
  this.status = 'archived';
  return this.save();
};

// Method to mark as completed
chatSchema.methods.markCompleted = function() {
  this.status = 'completed';
  return this.save();
};

// Method to get conversation history for AI
chatSchema.methods.getConversationHistory = function(limit: number = 20) {
  return this.messages
    .slice(-limit)
    .map((message: any) => ({
      role: message.role,
      content: message.content,
    }));
};

// Static method to find user's chats
chatSchema.statics.findByUserId = function(userId: string, limit: number = 50) {
  return this.find({ userId })
    .sort({ lastActivityAt: -1 })
    .limit(limit)
    .select('title status lastActivityAt stats.messageCount projectId');
};

// Static method to find chats by project
chatSchema.statics.findByProjectId = function(projectId: string) {
  return this.find({ projectId })
    .sort({ lastActivityAt: -1 })
    .populate('userId', 'firstName lastName');
};

// Static method to find active chats
chatSchema.statics.findActive = function(userId: string) {
  return this.find({ 
    userId, 
    status: 'active',
    lastActivityAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
  })
    .sort({ lastActivityAt: -1 })
    .limit(10);
};

// Static method to cleanup old chats
chatSchema.statics.cleanupOldChats = function() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return this.updateMany(
    { 
      status: 'active',
      lastActivityAt: { $lt: thirtyDaysAgo },
      'stats.messageCount': { $lte: 3 } // Only cleanup chats with few messages
    },
    { status: 'archived' }
  );
};

// Pre-save middleware to update title based on first message
chatSchema.pre('save', function(next) {
  if (this.messages && this.messages.length > 0 && this.title === 'New Chat') {
    const firstUserMessage = this.messages.find(m => m.role === 'user');
    if (firstUserMessage) {
      // Generate title from first 50 characters of first user message
      this.title = firstUserMessage.content.substring(0, 50).trim() + 
        (firstUserMessage.content.length > 50 ? '...' : '');
    }
  }
  next();
});

// Pre-save middleware to update stats
chatSchema.pre('save', function(next) {
  if (this.messages) {
    this.stats.messageCount = this.messages.length;
    
    // Calculate total tokens
    this.stats.totalTokens = this.messages.reduce((total, message) => {
      return total + (message.metadata?.tokens || 0);
    }, 0);
  }
  next();
});

const Chat = mongoose.model<IChat>('Chat', chatSchema);

export default Chat;
