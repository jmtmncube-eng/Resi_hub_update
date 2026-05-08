import { Router } from 'express';
import { authenticate }  from '../middleware/auth.middleware';
import { requireRole }   from '../middleware/role.middleware';
import { validate }      from '../middleware/validation.middleware';
import * as ctrl         from '../controllers/admin.controller';
import {
  createAllocationSchema,
  updateAllocationSchema,
  updateAccountSchema,
  createVoucherSchema,
  updateVoucherSchema,
  awardCreditsSchema,
} from '../validators/admin.validator';

const router = Router();

// All admin routes are restricted to ADMIN role
router.use(authenticate, requireRole('ADMIN'));

// ── Overview ──────────────────────────────────────────────────
router.get('/stats',          ctrl.getStats);

// ── Occupancy ─────────────────────────────────────────────────
router.get('/occupancy',      ctrl.getOccupancy);
router.post('/setup-rooms',   ctrl.setupRooms);
router.delete('/rooms/:id',   ctrl.deleteRoom);

// ── Allocations ───────────────────────────────────────────────
router.get('/allocations',                                   ctrl.getAllocations);
router.post('/allocations',   validate(createAllocationSchema), ctrl.createAllocation);
router.patch('/allocations/:id', validate(updateAllocationSchema), ctrl.updateAllocation);
router.delete('/allocations/:id',                            ctrl.removeAllocation);
router.post('/allocations/move',                             ctrl.moveAllocation);

// ── Accounts ──────────────────────────────────────────────────
router.get('/accounts',                                      ctrl.getAccounts);
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

// ── Voucher Claims ────────────────────────────────────────────
router.get('/claims',         ctrl.getVoucherClaims);
router.post('/claims/:id/approve', ctrl.approveVoucherClaim);
router.post('/claims/:id/reject',  ctrl.rejectVoucherClaim);

export default router;
