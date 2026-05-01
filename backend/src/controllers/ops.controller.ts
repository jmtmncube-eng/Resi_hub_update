import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as svc from '../services/ops.service';

export async function listServices(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { type, from, to } = req.query as { type?: string; from?: string; to?: string };
    const data = await svc.listOpsServices({ type: type as never, from, to });
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

export async function listStock(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await svc.listOpsStock();
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function setStock(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { quantity, threshold } = req.body as { quantity: number; threshold?: number };
    if (typeof quantity !== 'number' || !isFinite(quantity)) {
      res.status(400).json({ success: false, error: 'quantity (number) is required' });
      return;
    }
    const data = await svc.setOpsStock(req.params.key, quantity, threshold);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function getInsights(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await svc.getOpsInsights();
    res.json({ success: true, data });
  } catch (err) { next(err); }
}
