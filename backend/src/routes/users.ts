import { Router } from 'express';
import { body } from 'express-validator';
import { userController } from '../controllers/userController';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';

const router = Router();
router.use(authenticate);

// GET /api/users  — Admin only
router.get('/', authorize('ADMIN'), userController.listUsers);

// GET /api/users/developers  — Admin and PM (for task assignment)
router.get('/developers', authorize('ADMIN', 'PROJECT_MANAGER'), userController.listDevelopers);

// GET /api/users/me  — Any authenticated user
router.get('/me', userController.getMe);

// GET /api/users/:id  — Admin only
router.get('/:id', authorize('ADMIN'), userController.getUser);

// PATCH /api/users/:id  — Admin only
router.patch(
  '/:id',
  authorize('ADMIN'),
  [
    body('email').optional().isEmail().normalizeEmail(),
    body('name').optional().trim().notEmpty(),
    body('password').optional().isLength({ min: 8 }),
    body('role').optional().isIn(['ADMIN', 'PROJECT_MANAGER', 'DEVELOPER']),
  ],
  validate,
  userController.updateUser
);

// DELETE /api/users/:id  — Admin only
router.delete('/:id', authorize('ADMIN'), userController.deleteUser);

export default router;
