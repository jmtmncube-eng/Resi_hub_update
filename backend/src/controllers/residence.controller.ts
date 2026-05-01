import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as svc from '../services/residence.service';

export async function list(_req: AuthRequest, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await svc.listResidences() }); }
  catch (e) { next(e); }
}

export async function create(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await svc.createResidence(req.body);
    res.status(201).json({ success: true, data });
  } catch (e) { next(e); }
}

export async function update(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await svc.updateResidence(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

export async function archive(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await svc.archiveResidence(req.params.id);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}
