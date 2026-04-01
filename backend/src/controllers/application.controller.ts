import { Response, NextFunction } from 'express';
import { AuthRequest }            from '../middleware/auth.middleware';
import * as service               from '../services/application.service';

export async function getStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await service.getApplicationStatus(req.user!.userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getRooms(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await service.getAvailableRooms();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
