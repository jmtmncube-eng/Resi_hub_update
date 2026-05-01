import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as svc from '../services/contractor.service';

export async function list(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { residenceId } = req.query as { residenceId?: string };
    res.json({ success: true, data: await svc.listContractors(residenceId) });
  } catch (e) { next(e); }
}

export async function create(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await svc.createContractor(req.body);
    res.status(201).json({ success: true, data });
  } catch (e) { next(e); }
}

export async function update(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await svc.updateContractor(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

export async function end(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await svc.endContractor(req.params.id);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

export async function generateInvoice(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { period } = req.body as { period: string };
    if (!period) { res.status(400).json({ success: false, error: 'period required' }); return; }
    const data = await svc.generateContractorInvoice(req.params.id, period);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

export async function generateAllInvoices(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { period, residenceId } = req.body as { period: string; residenceId?: string };
    if (!period) { res.status(400).json({ success: false, error: 'period required' }); return; }
    const data = await svc.generateAllContractorInvoices(period, residenceId);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

export async function listInvoices(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { contractorId } = req.query as { contractorId?: string };
    res.json({ success: true, data: await svc.listContractorInvoices(contractorId) });
  } catch (e) { next(e); }
}

export async function markPaid(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { proofUrl } = req.body as { proofUrl?: string };
    res.json({ success: true, data: await svc.markContractorInvoicePaid(req.params.id, proofUrl) });
  } catch (e) { next(e); }
}
