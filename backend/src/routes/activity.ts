import { Router } from 'express';
import { activityController } from '../controllers/activityController';
import { authenticate } from '../middleware/authenticate';

const router = Router();
router.use(authenticate);

// GET /api/activity?projectId=&since=&limit=
// Role-scoped: Admin sees all, PM sees their projects, Dev sees their tasks
router.get('/', activityController.getFeed);

// GET /api/activity/missed?since=<ISO timestamp>
// Used by frontend on socket reconnect to fetch missed events from DB
router.get('/missed', activityController.getMissedEvents);

export default router;
