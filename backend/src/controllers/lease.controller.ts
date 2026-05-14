import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import prisma from '../config/database';
import * as svc from '../services/lease.service';

// ── Student-facing ─────────────────────────────────────────────

export async function getMyLease(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await svc.getMyLease(req.user!.userId) });
  } catch (err) { next(err); }
}

/** Student gives notice to vacate on their OWN allocation. */
export async function giveNoticeSelf(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const alloc = await prisma.allocation.findUnique({
      where: { userId: req.user!.userId }, select: { id: true },
    });
    if (!alloc) throw new AppError('You have no active allocation', 404);
    res.json({ success: true, data: await svc.giveNotice(alloc.id) });
  } catch (err) { next(err); }
}

// ── Admin / management ─────────────────────────────────────────

export async function getLease(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await svc.getLease(req.params.allocationId) });
  } catch (err) { next(err); }
}

export async function updateTerms(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await svc.updateLeaseTerms(req.params.allocationId, req.body) });
  } catch (err) { next(err); }
}

export async function recordDeposit(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await svc.recordDeposit(req.params.allocationId, req.body) });
  } catch (err) { next(err); }
}

export async function refundDeposit(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await svc.refundDeposit(req.params.allocationId, req.body) });
  } catch (err) { next(err); }
}

export async function giveNotice(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await svc.giveNotice(req.params.allocationId) });
  } catch (err) { next(err); }
}

export async function scheduleMoveOut(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await svc.scheduleMoveOut(req.params.allocationId, req.body) });
  } catch (err) { next(err); }
}

export async function completeMoveOut(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await svc.completeMoveOut(req.params.allocationId) });
  } catch (err) { next(err); }
}

export async function renewLease(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await svc.renewLease(req.params.allocationId, req.body) });
  } catch (err) { next(err); }
}

export async function listInspections(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await svc.listInspections(req.params.allocationId) });
  } catch (err) { next(err); }
}

export async function createInspection(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await svc.createInspection(req.params.allocationId, req.user!.userId, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
}
