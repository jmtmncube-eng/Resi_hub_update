import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole, OPS_STAFF } from '../middleware/role.middleware';
import * as ctrl        from '../controllers/ops.controller';

const router = Router();

// Ops logs — owner, manager, and the maintenance handyman.
router.use(authenticate, requireRole(...OPS_STAFF));

router.get('/services',          ctrl.listServices);
router.post('/services',         ctrl.createService);
router.delete('/services/:id',   ctrl.deleteService);

router.get('/stock',             ctrl.listStock);
router.put('/stock/:key',        ctrl.setStock);

router.get('/insights',          ctrl.getInsights);

export default router;
