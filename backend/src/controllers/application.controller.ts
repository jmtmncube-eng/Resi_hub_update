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

export async function selectRoom(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { roomId } = req.body as { roomId?: string };
    if (!roomId) { res.status(400).json({ success: false, error: 'roomId required' }); return; }
    const data = await service.selectRoom(req.user!.userId, roomId);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
