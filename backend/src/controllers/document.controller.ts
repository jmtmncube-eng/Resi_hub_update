import { Request, Response, NextFunction } from 'express';
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

export async function signDocument(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { signedByName } = req.body as { signedByName?: string };
    if (!signedByName?.trim()) {
      res.status(400).json({ success: false, error: 'signedByName is required' });
      return;
    }
    const doc = await svc.signDocument(req.params.id, req.user!.userId, signedByName);
    res.json({ success: true, data: doc });
  } catch (err) { next(err); }
}

/** POST /documents/:id/proof — student uploads payment proof (base64 data URL) */
export async function submitPaymentProof(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { proofUrl } = req.body as { proofUrl?: string };
    if (!proofUrl) { res.status(400).json({ success: false, error: 'proofUrl is required' }); return; }
    const doc = await svc.submitPaymentProof(req.params.id, req.user!.userId, proofUrl);
    res.json({ success: true, data: doc });
  } catch (err) { next(err); }
}

/** POST /documents/:id/clear — admin clears payment */
export async function clearPayment(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const doc = await svc.clearPayment(req.params.id, req.user!.userId);
    res.json({ success: true, data: doc });
  } catch (err) { next(err); }
}

/** POST /documents/:id/reject-proof — admin rejects proof */
export async function rejectPaymentProof(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const doc = await svc.rejectPaymentProof(req.params.id);
    res.json({ success: true, data: doc });
  } catch (err) { next(err); }
}

/** GET /documents/admin/invoices — admin views all invoices */
export async function getAllInvoices(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await svc.getAllInvoices();
    res.json({ success: true, data });
  } catch (err) { next(err); }
}
