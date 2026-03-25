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

// ── Allocations ───────────────────────────────────────────────
router.get('/allocations',                                   ctrl.getAllocations);
router.post('/allocations',   validate(createAllocationSchema), ctrl.createAllocation);
router.patch('/allocations/:id', validate(updateAllocationSchema), ctrl.updateAllocation);

// ── Accounts ──────────────────────────────────────────────────
router.get('/accounts',                                      ctrl.getAccounts);
router.patch('/accounts/:id', validate(updateAccountSchema), ctrl.updateAccount);

// ── Rewards / Vouchers ────────────────────────────────────────
router.get('/vouchers',                                      ctrl.getVouchers);
router.post('/vouchers',      validate(createVoucherSchema), ctrl.createVoucher);
router.patch('/vouchers/:id', validate(updateVoucherSchema), ctrl.updateVoucher);
router.delete('/vouchers/:id',                               ctrl.deleteVoucher);
router.post('/credits',       validate(awardCreditsSchema),  ctrl.awardCredits);

// ── Visitor Log ───────────────────────────────────────────────
router.get('/visitors',       ctrl.getVisitorLog);

export default router;
