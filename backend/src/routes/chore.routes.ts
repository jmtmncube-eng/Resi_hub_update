import { Router } from 'express';
import * as ctrl from '../controllers/chore.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();
router.use(authenticate);
router.use(requireRole('ACTIVE_STUDENT', 'ADMIN'));

router.get('/',                  ctrl.getChores);
router.post('/:id/claim',        ctrl.claimChore);
router.post('/:id/unclaim',      ctrl.unclaimChore);
router.post('/:id/complete',     ctrl.completeChore);

// Admin approval endpoints
router.get('/admin/pending',     requireRole('ADMIN'), ctrl.getPendingApprovals);
router.post('/admin/:id/approve', requireRole('ADMIN'), ctrl.approveChoreProof);
router.post('/admin/:id/reject', requireRole('ADMIN'), ctrl.rejectChoreProof);

export default router;
