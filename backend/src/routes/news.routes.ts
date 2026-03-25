import { Router } from 'express';
import * as ctrl from '../controllers/news.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validate } from '../middleware/validation.middleware';
import { createNewsSchema } from '../validators/news.validator';

const router = Router();
router.use(authenticate);

router.get('/',        ctrl.getAll);
router.get('/:id',     ctrl.getOne);
router.post('/',       requireRole('ADMIN'), validate(createNewsSchema), ctrl.create);
router.patch('/:id/pin', requireRole('ADMIN'), ctrl.pin);
router.delete('/:id',  requireRole('ADMIN'), ctrl.remove);

export default router;
