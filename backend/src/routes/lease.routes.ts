import { Router } from 'express';
import * as ctrl from '../controllers/lease.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole, MANAGEMENT } from '../middleware/role.middleware';

const router = Router();
router.use(authenticate);

// ── Student-facing — own lease only ────────────────────────────
router.get ('/me',             ctrl.getMyLease);
router.post('/me/give-notice', ctrl.giveNoticeSelf);

// ── Admin / management — lifecycle on any allocation ───────────
router.get ('/:allocationId',                    requireRole(...MANAGEMENT), ctrl.getLease);
router.patch('/:allocationId/terms',             requireRole(...MANAGEMENT), ctrl.updateTerms);
router.post('/:allocationId/deposit',            requireRole(...MANAGEMENT), ctrl.recordDeposit);
router.post('/:allocationId/deposit/refund',     requireRole(...MANAGEMENT), ctrl.refundDeposit);
router.post('/:allocationId/give-notice',        requireRole(...MANAGEMENT), ctrl.giveNotice);
router.post('/:allocationId/move-out/schedule',  requireRole(...MANAGEMENT), ctrl.scheduleMoveOut);
router.post('/:allocationId/move-out/complete',  requireRole(...MANAGEMENT), ctrl.completeMoveOut);
router.post('/:allocationId/renew',              requireRole(...MANAGEMENT), ctrl.renewLease);
router.get ('/:allocationId/inspections',        requireRole(...MANAGEMENT), ctrl.listInspections);
router.post('/:allocationId/inspections',        requireRole(...MANAGEMENT), ctrl.createInspection);

export default router;
