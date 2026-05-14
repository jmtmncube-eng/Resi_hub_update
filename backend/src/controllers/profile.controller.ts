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

export async function completeOnboarding(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await svc.completeOnboarding(req.user!.userId) });
  } catch (err) { next(err); }
}

export async function uploadAvatar(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No file uploaded' });
      return;
    }
    // Store a RELATIVE /api/uploads URL — resolves the same way in local dev
    // (Vite proxy) and on the VPS (nginx /api/ proxy). An absolute origin
    // URL would bake in localhost:5000 and break for every remote visitor.
    const avatarUrl = `/api/uploads/${req.file.filename}`;
    res.json({ success: true, data: await svc.updateAvatar(req.user!.userId, avatarUrl) });
  } catch (err) { next(err); }
}
