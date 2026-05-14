import { Router } from 'express';
import * as ctrl from '../controllers/chore.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole, MANAGEMENT } from '../middleware/role.middleware';

const router = Router();
router.use(authenticate);
// Students use the chore board; admin + manager reach the admin sub-routes.
router.use(requireRole('ACTIVE_STUDENT', ...MANAGEMENT));

router.get('/',                  ctrl.getChores);
router.post('/:id/claim',        ctrl.claimChore);
router.post('/:id/unclaim',      ctrl.unclaimChore);
router.post('/:id/complete',     ctrl.completeChore);

// Admin approval endpoints
router.get('/admin/pending',     requireRole(...MANAGEMENT), ctrl.getPendingApprovals);
router.post('/admin/:id/approve', requireRole(...MANAGEMENT), ctrl.approveChoreProof);
router.post('/admin/:id/reject', requireRole(...MANAGEMENT), ctrl.rejectChoreProof);

// Admin chore CRUD — must come AFTER /admin/pending so the parser doesn't
// try to match the literal "pending" as an :id parameter on PATCH.
router.get('/admin',             requireRole(...MANAGEMENT), ctrl.listAllChores);
router.post('/admin',            requireRole(...MANAGEMENT), ctrl.createChore);
router.patch('/admin/:id',       requireRole(...MANAGEMENT), ctrl.updateChore);
router.delete('/admin/:id',      requireRole(...MANAGEMENT), ctrl.deleteChore);

export default router;
