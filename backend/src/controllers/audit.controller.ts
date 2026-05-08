import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as svc from '../services/audit.service';

export async function list(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { action, entity, userId, search, page, limit } = req.query as {
      action?: string; entity?: string; userId?: string; search?: string;
      page?: string; limit?: string;
    };
    const data = await svc.listAuditLogs({
      action, entity, userId, search,
      page:  page  ? parseInt(page, 10)  : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function actions(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await svc.listAuditActions() });
  } catch (err) { next(err); }
}
