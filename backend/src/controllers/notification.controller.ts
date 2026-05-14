import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as svc from '../services/notification.service';

export async function list(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await svc.listNotifications(req.user!.userId) });
  } catch (err) { next(err); }
}

export async function unreadCount(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: { count: await svc.unreadCount(req.user!.userId) } });
  } catch (err) { next(err); }
}

export async function markRead(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await svc.markRead(req.user!.userId, req.params.id) });
  } catch (err) { next(err); }
}

export async function markAllRead(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await svc.markAllRead(req.user!.userId) });
  } catch (err) { next(err); }
}
