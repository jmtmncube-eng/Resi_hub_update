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

// Admin chore CRUD — must come AFTER /admin/pending so the parser doesn't
// try to match the literal "pending" as an :id parameter on PATCH.
router.get('/admin',             requireRole('ADMIN'), ctrl.listAllChores);
router.post('/admin',            requireRole('ADMIN'), ctrl.createChore);
router.patch('/admin/:id',       requireRole('ADMIN'), ctrl.updateChore);
router.delete('/admin/:id',      requireRole('ADMIN'), ctrl.deleteChore);

export default router;
