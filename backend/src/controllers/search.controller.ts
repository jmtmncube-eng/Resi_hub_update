import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import * as svc from '../services/search.service';

export async function search(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const q = (req.query.q as string) ?? '';
    const residenceId = req.query.residenceId as string | undefined;
    res.json({ success: true, data: await svc.globalSearch(q, residenceId) });
  } catch (err) { next(err); }
}

export async function exportCsv(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const type = req.params.type as svc.ExportType;
    if (!['accounts', 'invoices', 'tickets'].includes(type)) {
      throw new AppError('Unknown export type', 400);
    }
    const residenceId = req.query.residenceId as string | undefined;
    const csv = await svc.exportCsv(type, residenceId);
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="resihub-${type}-${stamp}.csv"`);
    res.send(csv);
  } catch (err) { next(err); }
}
