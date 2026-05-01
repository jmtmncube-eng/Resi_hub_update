import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole }  from '../middleware/role.middleware';
import * as ctrl        from '../controllers/ops.controller';

const router = Router();

// All ops endpoints are admin-only
router.use(authenticate, requireRole('ADMIN'));

router.get('/services',          ctrl.listServices);
router.post('/services',         ctrl.createService);
router.delete('/services/:id',   ctrl.deleteService);

router.get('/stock',             ctrl.listStock);
router.put('/stock/:key',        ctrl.setStock);

router.get('/insights',          ctrl.getInsights);

export default router;
