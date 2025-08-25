import express from 'express';
import { query, param, body, validationResult } from 'express-validator';
import { AuthenticatedRequest, ApiResponse, PaginatedResponse, ProjectFilters } from '../types';
import { asyncHandler } from '../middleware/errorHandler';
import { AppError } from '../middleware/errorHandler';
import { protect } from '../middleware/auth';
import Project from '../models/Project';
import Chat from '../models/Chat';
import User from '../models/User';
import logger from '../utils/logger';
import archiver from 'archiver';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// @desc    Get user's projects
// @route   GET /api/projects
// @access  Private
router.get(
  '/',
  protect,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
    query('status').optional().isIn(['analyzing', 'selecting', 'generating', 'complete', 'error']).withMessage('Invalid status'),
    query('complexity').optional().isIn(['simple', 'medium', 'complex']).withMessage('Invalid complexity'),
    query('sort').optional().isIn(['createdAt', 'updatedAt', 'name', 'qualityScore']).withMessage('Invalid sort field'),
    query('order').optional().isIn(['asc', 'desc']).withMessage('Order must be asc or desc'),
  ],
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400, errors.array());
    }

    const userId = req.user!._id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const sort = (req.query.sort as string) || 'createdAt';
    const order = (req.query.order as string) || 'desc';
    
    const filters: ProjectFilters = {
      status: req.query.status as string,
      complexity: req.query.complexity as string,
    };

    // Build query
    const query: any = { userId };
    if (filters.status) query.status = filters.status;
    if (filters.complexity) query['requirements.complexity'] = filters.complexity;

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const sortOptions: any = {};
    sortOptions[sort] = order === 'desc' ? -1 : 1;

    const [projects, total] = await Promise.all([
      Project.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .select('name description status progress requirements techStack stats qualityScore isPublic createdAt updatedAt')
        .lean(),
      Project.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      message: 'Projects retrieved successfully',
      data: projects,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    } as PaginatedResponse<typeof projects[0]>);
  })
);

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  Private
router.get(
  '/:id',
  protect,
  [
    param('id').isMongoId().withMessage('Invalid project ID'),
  ],
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400, errors.array());
    }

    const { id } = req.params;
    const userId = req.user!._id;

    const project = await Project.findOne({ _id: id, userId })
      .populate('components.componentId', 'name category description')
      .lean();

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    res.status(200).json({
      success: true,
      message: 'Project retrieved successfully',
      data: project,
    } as ApiResponse);
  })
);

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private
router.put(
  '/:id',
  protect,
  [
    param('id').isMongoId().withMessage('Invalid project ID'),
    body('name').optional().isString().isLength({ min: 1, max: 100 }).withMessage('Name must be between 1 and 100 characters'),
    body('description').optional().isString().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
    body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean'),
  ],
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400, errors.array());
    }

    const { id } = req.params;
    const userId = req.user!._id;
    const updates = req.body;

    const project = await Project.findOneAndUpdate(
      { _id: id, userId },
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-files'); // Don't return large files array

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    res.status(200).json({
      success: true,
      message: 'Project updated successfully',
      data: project,
    } as ApiResponse);
  })
);

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private
router.delete(
  '/:id',
  protect,
  [
    param('id').isMongoId().withMessage('Invalid project ID'),
  ],
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400, errors.array());
    }

    const { id } = req.params;
    const userId = req.user!._id;

    const project = await Project.findOneAndDelete({ _id: id, userId });

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    // Also delete associated chats
    await Chat.deleteMany({ projectId: id });

    logger.info('Project deleted', { projectId: id, userId: userId.toString() });

    res.status(200).json({
      success: true,
      message: 'Project deleted successfully',
    } as ApiResponse);
  })
);

// @desc    Download project as ZIP
// @route   GET /api/projects/:id/download
// @access  Private
router.get(
  '/:id/download',
  protect,
  [
    param('id').isMongoId().withMessage('Invalid project ID'),
  ],
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400, errors.array());
    }

    const { id } = req.params;
    const userId = req.user!._id;

    const project = await Project.findOne({ _id: id, userId });

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    if (project.status !== 'complete') {
      throw new AppError('Project is not complete yet', 400);
    }

    const projectName = project.name.replace(/[^a-zA-Z0-9-_]/g, '_');
    const filename = `${projectName}.zip`;

    // Set response headers
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Create ZIP archive
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    // Pipe archive data to response
    archive.pipe(res);

    // Add files to archive
    project.files.forEach(file => {
      if (file.type === 'file') {
        archive.append(file.content, { name: file.path });
      }
    });

    // Add README with setup instructions
    const readme = `# ${project.name}

Generated with AI App Builder

## Setup Instructions

1. Install dependencies:
\`\`\`bash
npm install
\`\`\`

2. Start development server:
\`\`\`bash
npm run dev
\`\`\`

3. Open your browser to http://localhost:3000

## Project Details

- **Quality Score**: ${project.qualityScore}/100
- **Total Files**: ${project.stats.totalFiles}
- **Lines of Code**: ${project.stats.linesOfCode}
- **Generated**: ${new Date(project.createdAt).toLocaleDateString()}

## Tech Stack

${Object.entries(project.techStack).map(([key, value]) => `- **${key}**: ${value}`).join('\n')}

Enjoy your new application! 🎉
`;

    archive.append(readme, { name: 'README.md' });

    // Finalize archive
    await archive.finalize();

    logger.info('Project downloaded', { 
      projectId: id, 
      userId: userId.toString(), 
      filename 
    });
  })
);

// @desc    Get project files
// @route   GET /api/projects/:id/files
// @access  Private
router.get(
  '/:id/files',
  protect,
  [
    param('id').isMongoId().withMessage('Invalid project ID'),
    query('path').optional().isString().withMessage('Path must be a string'),
  ],
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400, errors.array());
    }

    const { id } = req.params;
    const userId = req.user!._id;
    const filePath = req.query.path as string;

    const project = await Project.findOne({ _id: id, userId })
      .select('files name status');

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    // If specific file requested
    if (filePath) {
      const file = project.files.find(f => f.path === filePath);
      if (!file) {
        throw new AppError('File not found', 404);
      }

      res.status(200).json({
        success: true,
        message: 'File retrieved successfully',
        data: file,
      } as ApiResponse);
      return;
    }

    // Return file tree structure
    const fileTree = buildFileTree(project.files);

    res.status(200).json({
      success: true,
      message: 'Files retrieved successfully',
      data: {
        tree: fileTree,
        totalFiles: project.files.filter(f => f.type === 'file').length,
        files: project.files.map(f => ({ path: f.path, type: f.type })),
      },
    } as ApiResponse);
  })
);

// @desc    Share project
// @route   POST /api/projects/:id/share
// @access  Private
router.post(
  '/:id/share',
  protect,
  [
    param('id').isMongoId().withMessage('Invalid project ID'),
  ],
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400, errors.array());
    }

    const { id } = req.params;
    const userId = req.user!._id;

    const project = await Project.findOne({ _id: id, userId });

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    if (project.status !== 'complete') {
      throw new AppError('Only complete projects can be shared', 400);
    }

    // Generate share token if not exists
    if (!project.shareToken) {
      await project.generateShareToken();
    }

    const shareUrl = `${process.env.FRONTEND_URL}/share/${project.shareToken}`;

    res.status(200).json({
      success: true,
      message: 'Share link generated successfully',
      data: {
        shareToken: project.shareToken,
        shareUrl,
        isPublic: project.isPublic,
      },
    } as ApiResponse);
  })
);

// @desc    Get public projects
// @route   GET /api/projects/public
// @access  Public
router.get(
  '/public/explore',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 20 }).withMessage('Limit must be between 1 and 20'),
    query('sort').optional().isIn(['createdAt', 'qualityScore']).withMessage('Invalid sort field'),
  ],
  asyncHandler(async (req: express.Request, res: express.Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400, errors.array());
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const sort = (req.query.sort as string) || 'createdAt';
    const order = 'desc';

    const skip = (page - 1) * limit;
    const sortOptions: any = {};
    sortOptions[sort] = order === 'desc' ? -1 : 1;

    const [projects, total] = await Promise.all([
      Project.find({ isPublic: true, status: 'complete' })
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .select('name description requirements techStack stats qualityScore createdAt')
        .populate('userId', 'firstName lastName avatar')
        .lean(),
      Project.countDocuments({ isPublic: true, status: 'complete' }),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      message: 'Public projects retrieved successfully',
      data: projects,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    } as PaginatedResponse<typeof projects[0]>);
  })
);

// Helper function to build file tree
function buildFileTree(files: any[]) {
  const tree: any = {};
  
  files.forEach(file => {
    const parts = file.path.split('/');
    let current = tree;
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1 && file.type === 'file';
      
      if (!current[part]) {
        current[part] = isFile ? { type: 'file', path: file.path } : { type: 'directory', children: {} };
      }
      
      if (!isFile) {
        current = current[part].children;
      }
    }
  });
  
  return tree;
}

export default router;
