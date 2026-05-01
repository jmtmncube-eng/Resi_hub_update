import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/settings.service';

export async function getSettings(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await svc.getSettings();
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

export async function updateSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await svc.updateSettings(req.body);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}
