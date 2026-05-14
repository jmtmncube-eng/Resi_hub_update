import { Router } from 'express';
import { authenticate }  from '../middleware/auth.middleware';
import { requireRole, MANAGEMENT } from '../middleware/role.middleware';
import { validate }      from '../middleware/validation.middleware';
import * as ctrl         from '../controllers/admin.controller';
import * as searchCtrl   from '../controllers/search.controller';
import {
  createAllocationSchema,
  updateAllocationSchema,
  updateAccountSchema,
  createVoucherSchema,
  updateVoucherSchema,
  awardCreditsSchema,
} from '../validators/admin.validator';

const router = Router();

// Admin API — owner + manager. Privilege-sensitive account actions
// (role changes, touching admin/manager accounts) are guarded again in
// admin.service.ts against the actor's own role.
router.use(authenticate, requireRole(...MANAGEMENT));

// ── Overview ──────────────────────────────────────────────────
router.get('/stats',          ctrl.getStats);

// ── Occupancy ─────────────────────────────────────────────────
router.get('/occupancy',      ctrl.getOccupancy);
router.post('/setup-rooms',   ctrl.setupRooms);
router.post('/rooms',         ctrl.createRoom);
router.delete('/rooms/:id',   ctrl.deleteRoom);

// ── Allocations ───────────────────────────────────────────────
router.get('/allocations',                                   ctrl.getAllocations);
router.post('/allocations',   validate(createAllocationSchema), ctrl.createAllocation);
router.patch('/allocations/:id', validate(updateAllocationSchema), ctrl.updateAllocation);
router.delete('/allocations/:id',                            ctrl.removeAllocation);
router.post('/allocations/move',                             ctrl.moveAllocation);

// ── Accounts ──────────────────────────────────────────────────
router.get('/accounts',                                      ctrl.getAccounts);
router.get('/accounts/:id/overview',                         ctrl.getAccountOverview);
router.patch('/accounts/:id', validate(updateAccountSchema), ctrl.updateAccount);
router.post('/accounts/:id/approve',                         ctrl.approveAccount);
router.post('/accounts/:id/active',                          ctrl.setAccountActive);

// ── Rewards / Vouchers ────────────────────────────────────────
router.get('/vouchers',                                      ctrl.getVouchers);
router.post('/vouchers',      validate(createVoucherSchema), ctrl.createVoucher);
router.patch('/vouchers/:id', validate(updateVoucherSchema), ctrl.updateVoucher);
router.delete('/vouchers/:id',                               ctrl.deleteVoucher);
router.post('/credits',       validate(awardCreditsSchema),  ctrl.awardCredits);

// ── Visitor Log ───────────────────────────────────────────────
router.get('/visitors',       ctrl.getVisitorLog);

// ── Revenue Report ────────────────────────────────────────────
router.get('/revenue',        ctrl.getRevenueReport);

// ── Analytics ─────────────────────────────────────────────────
router.get('/analytics',      ctrl.getAnalytics);

// ── Global search + CSV export ────────────────────────────────
router.get('/search',         searchCtrl.search);
router.get('/export/:type',   searchCtrl.exportCsv);

export default router;
