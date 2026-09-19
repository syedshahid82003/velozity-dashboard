import { Router } from 'express';
import { body } from 'express-validator';
import { projectController } from '../controllers/projectController';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';

const router = Router();
router.use(authenticate);

// GET /api/projects — all roles (scoped in service layer)
router.get('/', projectController.listProjects);

// GET /api/projects/:id — all roles (scoped in service layer)
router.get('/:id', projectController.getProject);

// POST /api/projects — Admin and PM only
router.post(
  '/',
  authorize('ADMIN', 'PROJECT_MANAGER'),
  [
    body('name').trim().notEmpty().withMessage('Project name is required'),
    body('clientId').isUUID().withMessage('Valid client ID required'),
    body('description').optional().trim(),
    body('managerId').optional().isUUID().withMessage('Valid manager ID required'),
  ],
  validate,
  projectController.createProject
);

// PATCH /api/projects/:id — Admin and PM only (ownership enforced in service)
router.patch(
  '/:id',
  authorize('ADMIN', 'PROJECT_MANAGER'),
  [
    body('name').optional().trim().notEmpty(),
    body('description').optional().trim(),
    body('clientId').optional().isUUID(),
  ],
  validate,
  projectController.updateProject
);

// DELETE /api/projects/:id — Admin and PM only (ownership enforced in service)
router.delete('/:id', authorize('ADMIN', 'PROJECT_MANAGER'), projectController.deleteProject);

export default router;
