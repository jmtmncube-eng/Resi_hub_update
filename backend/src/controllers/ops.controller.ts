import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as svc from '../services/ops.service';

export async function listServices(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { type, from, to, residenceId } = req.query as {
      type?: string; from?: string; to?: string; residenceId?: string;
    };
    const data = await svc.listOpsServices({ type: type as never, from, to, residenceId });
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function createService(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await svc.createOpsService(req.user!.userId, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
}

export async function deleteService(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await svc.deleteOpsService(req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function listStock(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { residenceId } = req.query as { residenceId?: string };
    const data = await svc.listOpsStock(residenceId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function setStock(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { quantity, threshold, residenceId } = req.body as {
      quantity: number; threshold?: number; residenceId?: string;
    };
    if (typeof quantity !== 'number' || !isFinite(quantity)) {
      res.status(400).json({ success: false, error: 'quantity (number) is required' });
      return;
    }
    const data = await svc.setOpsStock(req.params.key, quantity, threshold, residenceId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function getInsights(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { residenceId } = req.query as { residenceId?: string };
    const data = await svc.getOpsInsights(residenceId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}
