import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole }  from '../middleware/role.middleware';
import * as ctrl        from '../controllers/settings.controller';

const router = Router();

// Public read — any authenticated user can see residence info
router.get('/', authenticate, ctrl.getSettings);

// Admin only — write
router.put('/', authenticate, requireRole('ADMIN'), ctrl.updateSettings);

export default router;
