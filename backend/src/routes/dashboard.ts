import { Router } from 'express';
import { dashboardController } from '../controllers/dashboardController';
import { authenticate } from '../middleware/authenticate';

const router = Router();
router.use(authenticate);

// GET /api/dashboard — returns role-appropriate stats for the current user
router.get('/', dashboardController.getStats);

export default router;
