import { Router } from 'express';
import { body } from 'express-validator';
import { authController } from '../controllers/authController';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';

const router = Router();

// POST /api/auth/register — Admin only (creating team accounts)
router.post(
  '/register',
  authenticate,
  authorize('ADMIN'),
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('role')
      .isIn(['ADMIN', 'PROJECT_MANAGER', 'DEVELOPER'])
      .withMessage('Role must be ADMIN, PROJECT_MANAGER, or DEVELOPER'),
  ],
  validate,
  authController.register
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  authController.login
);

// POST /api/auth/refresh  — uses HttpOnly cookie
router.post('/refresh', authController.refresh);

// POST /api/auth/logout
router.post('/logout', authController.logout);

// GET /api/auth/me  — returns current user from access token
router.get('/me', authenticate, authController.me);

export default router;
