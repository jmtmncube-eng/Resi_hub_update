import { Router } from 'express';
import * as ctrl from '../controllers/news.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole, MANAGEMENT } from '../middleware/role.middleware';
import { validate } from '../middleware/validation.middleware';
import { createNewsSchema } from '../validators/news.validator';

const router = Router();
router.use(authenticate);

router.get('/',           ctrl.getAll);
router.post('/read-all',  ctrl.markAllRead);
router.get('/:id',        ctrl.getOne);
router.post('/:id/read',  ctrl.markRead);
router.post('/',          requireRole(...MANAGEMENT), validate(createNewsSchema), ctrl.create);
router.patch('/:id/pin',  requireRole(...MANAGEMENT), ctrl.pin);
router.delete('/:id',     requireRole(...MANAGEMENT), ctrl.remove);

export default router;
