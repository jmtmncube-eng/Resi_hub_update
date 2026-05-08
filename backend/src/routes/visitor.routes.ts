import { Router } from 'express';
import * as ctrl from '../controllers/visitor.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validate } from '../middleware/validation.middleware';
import { createVisitorSchema } from '../validators/visitor.validator';

const router = Router();
router.use(authenticate);

// Student
router.get('/',       requireRole('ACTIVE_STUDENT'), ctrl.getMyPasses);
router.post('/',      requireRole('ACTIVE_STUDENT'), validate(createVisitorSchema), ctrl.createPass);
router.delete('/:id', requireRole('ACTIVE_STUDENT'), ctrl.cancelPass);

// Admin
router.get('/admin/all',     requireRole('ADMIN'), ctrl.getAllPasses);
router.patch('/:id/checkin',     requireRole('ADMIN'), ctrl.checkIn);
router.patch('/:id/checkout',    requireRole('ADMIN'), ctrl.checkOut);
router.delete('/admin/:id',      requireRole('ADMIN'), ctrl.adminDeletePass);

export default router;
