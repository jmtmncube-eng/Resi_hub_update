import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as svc from '../services/visitor.service';

export async function getMyPasses(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await svc.getMyPasses(req.user!.userId) });
  } catch (err) { next(err); }
}

export async function createPass(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const pass = await svc.createPass(req.user!.userId, req.body);
    res.status(201).json({ success: true, data: pass });
  } catch (err) { next(err); }
}

export async function cancelPass(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const pass = await svc.cancelPass(req.params.id, req.user!.userId);
    res.json({ success: true, data: pass });
  } catch (err) { next(err); }
}

export async function getAllPasses(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await svc.getAllPasses() });
  } catch (err) { next(err); }
}

export async function checkIn(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await svc.checkIn(req.params.id) });
  } catch (err) { next(err); }
}

export async function checkOut(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await svc.checkOut(req.params.id) });
  } catch (err) { next(err); }
}

export async function adminDeletePass(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await svc.adminDeletePass(req.params.id) });
  } catch (err) { next(err); }
}

/** Public gate scan — no auth. The QR code IS the credential. */
export async function gateScan(req: Request, res: Response, next: NextFunction) {
  try {
    const code = (req.body?.qrCode ?? req.query?.code) as string | undefined;
    if (!code) {
      res.status(400).json({ success: false, error: 'qrCode (in body) or ?code= query is required' });
      return;
    }
    res.json({ success: true, data: await svc.gateScan(code) });
  } catch (err) { next(err); }
}
