import { Router } from 'express';
import { getHousemates } from '../controllers/housemate.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();
router.get('/', authenticate, requireRole('ACTIVE_STUDENT'), getHousemates);
export default router;
