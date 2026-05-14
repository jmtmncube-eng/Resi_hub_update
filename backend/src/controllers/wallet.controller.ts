import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as svc from '../services/wallet.service';

export async function getWallet(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await svc.getWallet(req.user!.userId) });
  } catch (err) { next(err); }
}

export async function getVouchers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await svc.getVouchers(req.user!.userId) });
  } catch (err) { next(err); }
}

export async function redeemVoucher(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await svc.redeemVoucher(req.user!.userId, req.params.voucherId);
    res.json({ success: true, data: result, message: `🎉 ${result.voucher.name} redeemed!` });
  } catch (err) { next(err); }
}

export async function getLeaderboard(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await svc.getLeaderboard() });
  } catch (err) { next(err); }
}
