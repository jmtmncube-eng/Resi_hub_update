import { Router } from 'express';
import * as ctrl from '../controllers/wallet.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();
router.use(authenticate);

router.get('/',                           requireRole('ACTIVE_STUDENT'), ctrl.getWallet);
router.get('/vouchers',                   ctrl.getVouchers);
router.get('/leaderboard',                ctrl.getLeaderboard);
router.post('/redeem/:voucherId',         requireRole('ACTIVE_STUDENT'), ctrl.redeemVoucher);
router.post('/task-proof/:voucherId',     requireRole('ACTIVE_STUDENT'), ctrl.submitTaskProof);

export default router;
