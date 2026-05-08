import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole }  from '../middleware/role.middleware';
import * as ctrl        from '../controllers/audit.controller';

const router = Router();
router.use(authenticate, requireRole('ADMIN'));

router.get('/',         ctrl.list);
router.get('/actions',  ctrl.actions);

export default router;
