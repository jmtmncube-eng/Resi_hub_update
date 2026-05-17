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
    // Page-state filters — only the relevant ones per type are
    // honoured by the service; the rest fall through harmlessly.
    const q          = (req.query.q          as string | undefined) || undefined;
    const role       = (req.query.role       as string | undefined) || undefined;
    const status     = (req.query.status     as string | undefined) || undefined;
    const priority   = (req.query.priority   as string | undefined) || undefined;
    const proof      = (req.query.proof      as string | undefined) || undefined;

    const csv = await svc.exportCsv(type, { residenceId, q, role, status, priority, proof });

    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="resihub-${type}-${stamp}.csv"`);
    // Prepend a UTF-8 BOM so Excel decodes the file correctly. Without
    // the BOM, Windows Excel uses the system code page (typically
    // CP-1252 / Windows-1252) and accented characters get mangled
    // — François becomes "François", etc. The BOM tells Excel
    // "this is UTF-8"; every other tool (LibreOffice, Google Sheets,
    // Numbers, raw cat) handles it transparently.
    res.send('﻿' + csv);
  } catch (err) { next(err); }
}
