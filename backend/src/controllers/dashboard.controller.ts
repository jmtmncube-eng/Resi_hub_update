import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as dashboardService from '../services/dashboard.service';

export async function getDashboard(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await dashboardService.getDashboard(req.user!.userId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}
