import { Router } from 'express';
import { body } from 'express-validator';
import { clientController } from '../controllers/clientController';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';

const router = Router();
router.use(authenticate);
// Clients are managed by Admin only; PM can read (for project creation)
router.use(authorize('ADMIN', 'PROJECT_MANAGER'));

router.get('/', clientController.listClients);
router.get('/:id', clientController.getClient);

router.post(
  '/',
  authorize('ADMIN'),
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('company').trim().notEmpty().withMessage('Company is required'),
  ],
  validate,
  clientController.createClient
);

router.patch(
  '/:id',
  authorize('ADMIN'),
  [
    body('name').optional().trim().notEmpty(),
    body('email').optional().isEmail().normalizeEmail(),
    body('company').optional().trim().notEmpty(),
  ],
  validate,
  clientController.updateClient
);

router.delete('/:id', authorize('ADMIN'), clientController.deleteClient);

export default router;
