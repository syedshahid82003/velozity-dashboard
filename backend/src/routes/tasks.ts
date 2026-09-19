import { Router } from 'express';
import { body } from 'express-validator';
import { taskController } from '../controllers/taskController';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';

const router = Router();
router.use(authenticate);

// GET /api/tasks?projectId=&status=&priority=&dueDateFrom=&dueDateTo=&page=&limit=
// All roles (scoped in service)
router.get('/', taskController.listTasks);

// GET /api/tasks/:id
router.get('/:id', taskController.getTask);

// POST /api/tasks — Admin and PM only
router.post(
  '/',
  authorize('ADMIN', 'PROJECT_MANAGER'),
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('projectId').isUUID().withMessage('Valid project ID required'),
    body('description').optional().trim(),
    body('assignedToId').optional().isUUID().withMessage('Valid user ID required'),
    body('priority')
      .optional()
      .isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
      .withMessage('Invalid priority'),
    body('dueDate').optional().isISO8601().withMessage('Valid date required'),
  ],
  validate,
  taskController.createTask
);

// PATCH /api/tasks/:id
// All roles can call this; service layer enforces what each role can update
router.patch(
  '/:id',
  [
    body('title').optional().trim().notEmpty(),
    body('description').optional().trim(),
    body('assignedToId').optional({ nullable: true }).isUUID(),
    body('status')
      .optional()
      .isIn(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'OVERDUE'])
      .withMessage('Invalid status'),
    body('priority')
      .optional()
      .isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
      .withMessage('Invalid priority'),
    body('dueDate').optional({ nullable: true }).isISO8601(),
  ],
  validate,
  taskController.updateTask
);

// DELETE /api/tasks/:id — Admin and PM only
router.delete('/:id', authorize('ADMIN', 'PROJECT_MANAGER'), taskController.deleteTask);

export default router;
