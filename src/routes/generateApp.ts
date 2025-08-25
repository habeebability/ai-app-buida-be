import express from 'express';
import { body, validationResult } from 'express-validator';
import { AuthenticatedRequest, GenerateAppRequest, ApiResponse } from '../types';
import { asyncHandler } from '../middleware/errorHandler';
import { AppError } from '../middleware/errorHandler';
import { protect } from '../middleware/auth';
import Project from '../models/Project';
import Chat from '../models/Chat';
import logger from '../utils/logger';

// Import services (to be created)
// import { analyzeRequirements } from '../services/aiService';
// import { selectComponents } from '../services/componentService';
// import { generateProject } from '../services/codeGeneratorService';

const router = express.Router();

// @desc    Generate a new application
// @route   POST /api/generate-app
// @access  Private
router.post(
  '/',
  protect,
  [
    body('userInput')
      .isString()
      .isLength({ min: 10, max: 2000 })
      .withMessage('User input must be between 10 and 2000 characters'),
    body('preferences.framework')
      .optional()
      .isIn(['nextjs', 'react', 'vue'])
      .withMessage('Invalid framework'),
    body('preferences.auth')
      .optional()
      .isIn(['nextauth', 'clerk', 'auth0'])
      .withMessage('Invalid auth provider'),
    body('preferences.database')
      .optional()
      .isIn(['prisma', 'mongodb', 'supabase'])
      .withMessage('Invalid database option'),
    body('preferences.payments')
      .optional()
      .isIn(['stripe', 'paypal', 'none'])
      .withMessage('Invalid payments option'),
  ],
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response): Promise<void> => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400, errors.array());
    }

    const { userInput, preferences = {} }: GenerateAppRequest = req.body;
    const userId = req.user!._id;

    logger.info('Starting app generation', { 
      userId: userId.toString(), 
      inputLength: userInput.length,
      preferences 
    });

    try {
      // Create initial project record
      const project = await Project.create({
        name: 'New Project', // Will be updated during generation
        userId,
        status: 'analyzing',
        progress: 5,
        currentStep: 'Analyzing requirements',
        userInput,
        requirements: {
          features: [],
          entities: [],
          integrations: [],
          complexity: 'simple',
          estimatedComponents: 0,
        },
        components: [],
        files: [],
        integrations: [],
        qualityScore: 0,
        techStack: {
          framework: preferences.framework || 'nextjs',
          language: 'typescript',
          styling: 'tailwindcss',
          database: preferences.database || 'prisma',
          auth: preferences.auth || 'nextauth',
        },
        stats: {
          totalFiles: 0,
          totalSize: 0,
          linesOfCode: 0,
        },
        isPublic: false,
      });

      // Create chat for this project
      const chat = await Chat.create({
        userId,
        projectId: project._id,
        title: 'New Chat',
        messages: [{
          id: new Date().getTime().toString(),
          role: 'user',
          content: userInput,
          timestamp: new Date(),
          metadata: {},
          attachments: [],
        }],
        status: 'active',
        context: {
          currentIntent: 'generate_app',
          lastUserInput: userInput,
          projectRequirements: {
            features: [],
            integrations: [],
          },
          selectedComponents: [],
          generationState: {
            step: 'analyzing',
            progress: 5,
            errors: [],
          },
        },
        stats: {
          messageCount: 1,
          totalTokens: 0,
          avgResponseTime: 0,
        },
        preferences: {
          autoSave: true,
          notifications: true,
        },
      });

      // Start async generation process
      generateApplicationAsync(project._id.toString(), userInput, preferences, chat._id.toString())
        .catch(error => {
          logger.error('Async generation failed', { 
            projectId: project._id.toString(), 
            error: error.message 
          });
          // Mark project as error
          Project.findByIdAndUpdate(project._id, {
            status: 'error',
            error: {
              message: error.message,
              stack: error.stack,
              timestamp: new Date(),
            },
          }).catch(updateError => {
            logger.error('Failed to update project error status', { updateError });
          });
        });

      // Respond immediately with project info
      res.status(201).json({
        success: true,
        message: 'App generation started successfully',
        data: {
          projectId: project._id,
          chatId: chat._id,
          status: project.status,
          progress: project.progress,
          currentStep: project.currentStep,
          estimatedTime: 30, // seconds
        },
      } as ApiResponse);

    } catch (error) {
      logger.error('App generation failed', { 
        userId: userId.toString(), 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw new AppError('Failed to start app generation', 500);
    }
  })
);

// @desc    Get generation status
// @route   GET /api/generate-app/:projectId/status
// @access  Private
router.get(
  '/:projectId/status',
  protect,
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response): Promise<void> => {
    const { projectId } = req.params;
    const userId = req.user!._id;

    const project = await Project.findOne({ 
      _id: projectId, 
      userId 
    });

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    res.status(200).json({
      success: true,
      message: 'Status retrieved successfully',
      data: {
        projectId: project._id,
        status: project.status,
        progress: project.progress,
        currentStep: project.currentStep,
        error: project.error,
        qualityScore: project.qualityScore,
        stats: project.stats,
      },
    } as ApiResponse);
  })
);

// Async function to handle the generation process
async function generateApplicationAsync(
  projectId: string, 
  userInput: string, 
  preferences: any,
  chatId: string
): Promise<void> {
  
  try {
    const project = await Project.findById(projectId);
    const chat = await Chat.findById(chatId);
    
    if (!project || !chat) {
      throw new Error('Project or chat not found');
    }

    // Step 1: Analyze requirements (10-20%)
    await project.updateProgress(10, 'Analyzing requirements...');
    await chat.updateContext({
      generationState: { step: 'analyzing', progress: 10, errors: [] }
    });

    // Analyze requirements using AI service
    
    // Mock requirements analysis for now
    const requirements = {
      features: ['dashboard', 'authentication', 'user management'],
      entities: ['users', 'projects', 'settings'],
      integrations: ['auth', 'database'],
      complexity: 'medium' as const,
      estimatedComponents: 8,
    };

    // Update project with requirements
    project.requirements = requirements;
    project.name = generateProjectName(userInput);
    await project.save();

    await project.updateProgress(25, 'Selecting optimal components...');
    await chat.addMessage({
      role: 'assistant',
      content: `I've analyzed your requirements and identified the following features: ${requirements.features.join(', ')}. Now selecting the best components...`,
      metadata: { tokens: 50 }
    });

    // Step 2: Select components (25-50%)
    // Select optimal components based on requirements

    // Mock component selection for now  
    const mongoose = require('mongoose');
    const mockComponents = [
      {
        componentId: new mongoose.Types.ObjectId('64f8b1a2e1234567890abcde'), // Mock ObjectId
        variantId: 'modern-auth',
        customizations: {},
      },
    ];

    project.components = mockComponents;
    await project.save();

    await project.updateProgress(60, 'Generating application code...');
    await chat.addMessage({
      role: 'assistant',
      content: `Selected ${mockComponents.length} components. Now generating your application code...`,
      metadata: { tokens: 30 }
    });

    // Step 3: Generate code (50-90%)
    // Generate application code

    // Mock file generation for now
    const mockFiles = [
      {
        path: 'package.json',
        content: JSON.stringify({
          name: project.name.toLowerCase().replace(/\s+/g, '-'),
          version: '1.0.0',
          private: true,
          scripts: {
            dev: 'next dev',
            build: 'next build',
            start: 'next start',
          },
          dependencies: {
            'next': '^14.0.0',
            'react': '^18.2.0',
            'react-dom': '^18.2.0',
            'typescript': '^5.0.0',
          },
        }, null, 2),
        type: 'file' as const,
      },
      {
        path: 'src/app/page.tsx',
        content: `export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to ${project.name}
        </h1>
        <p className="text-gray-600">
          Your AI-generated application is ready!
        </p>
      </div>
    </div>
  );
}`,
        type: 'file' as const,
      },
    ];

    project.files = mockFiles;
    project.qualityScore = 85;
    await project.save();

    await project.updateProgress(95, 'Running final quality checks...');
    
    // Step 4: Quality checks (90-100%)
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing

    // Mark as complete
    await project.markComplete();
    await chat.markCompleted();
    await chat.addMessage({
      role: 'assistant',
      content: `🎉 Your application "${project.name}" has been generated successfully! Quality score: ${project.qualityScore}/100. You can now download and run your project.`,
      metadata: { tokens: 40 }
    });

    logger.info('App generation completed successfully', { 
      projectId, 
      qualityScore: project.qualityScore,
      filesGenerated: project.files.length 
    });

  } catch (error) {
    logger.error('Generation process failed', { projectId, error });
    throw error;
  }
}

// Helper function to generate project name from user input
function generateProjectName(userInput: string): string {
  const words = userInput.split(' ').filter(word => word.length > 2);
  if (words.length === 0) return 'Generated App';
  
  // Take first 3 meaningful words and capitalize them
  const nameWords = words.slice(0, 3).map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  );
  
  return nameWords.join(' ') + ' App';
}

export default router;
