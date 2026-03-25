import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as svc from '../services/document.service';

export async function getMyDocuments(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await svc.getMyDocuments(req.user!.userId) });
  } catch (err) { next(err); }
}

export async function getDocument(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const doc = await svc.getDocumentById(req.params.id, req.user!.userId, req.user!.role);
    res.json({ success: true, data: doc });
  } catch (err) { next(err); }
}
