import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as svc from '../services/housemate.service';

export async function getHousemates(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await svc.getHousemates(req.user!.userId) });
  } catch (err) { next(err); }
}
