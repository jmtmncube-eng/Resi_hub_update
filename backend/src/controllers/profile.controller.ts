import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as svc from '../services/profile.service';

export async function getProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await svc.getProfile(req.user!.userId) });
  } catch (err) { next(err); }
}

export async function updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await svc.updateProfile(req.user!.userId, req.body) });
  } catch (err) { next(err); }
}

export async function uploadAvatar(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No file uploaded' });
      return;
    }
    // Store absolute URL so the SPA (different origin in dev) can render it directly.
    const origin = `${req.protocol}://${req.get('host')}`;
    const avatarUrl = `${origin}/uploads/${req.file.filename}`;
    res.json({ success: true, data: await svc.updateAvatar(req.user!.userId, avatarUrl) });
  } catch (err) { next(err); }
}
