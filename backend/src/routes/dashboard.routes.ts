import { Router } from 'express';
import { getDashboard } from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();
router.get('/', authenticate, requireRole('ACTIVE_STUDENT'), getDashboard);
export default router;
