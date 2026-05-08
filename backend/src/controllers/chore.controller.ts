import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as svc from '../services/chore.service';
import prisma from '../config/database';

export async function getChores(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    // Service resolves the student's residence + block from their allocation;
    // the optional ?block= query is a manual override (admin viewing any block).
    const block = (req.query.block as string) || undefined;
    res.json({ success: true, data: await svc.getChores(req.user!.userId, block) });
  } catch (err) { next(err); }
}

export async function claimChore(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await svc.claimChore(req.params.id, req.user!.userId) });
  } catch (err) { next(err); }
}

export async function unclaimChore(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await svc.unclaimChore(req.params.id, req.user!.userId) });
  } catch (err) { next(err); }
}

export async function completeChore(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { note, proofUrl } = req.body;
    res.json({ success: true, data: await svc.completeChore(req.params.id, req.user!.userId, proofUrl, note) });
  } catch (err) { next(err); }
}

export async function getPendingApprovals(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await svc.getPendingApprovals() });
  } catch (err) { next(err); }
}

export async function approveChoreProof(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await svc.approveChoreProof(req.params.id, req.user!.userId) });
  } catch (err) { next(err); }
}

export async function rejectChoreProof(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await svc.rejectChoreProof(req.params.id, req.user!.userId, req.body?.adminNote) });
  } catch (err) { next(err); }
}

// ── Admin chore CRUD ──────────────────────────────────────────
export async function listAllChores(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { residenceId } = req.query as { residenceId?: string };
    res.json({ success: true, data: await svc.listAllChores(residenceId) });
  } catch (err) { next(err); }
}

export async function createChore(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await svc.createChore(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
}

export async function updateChore(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await svc.updateChore(req.params.id, req.body) });
  } catch (err) { next(err); }
}

export async function deleteChore(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await svc.deleteChore(req.params.id) });
  } catch (err) { next(err); }
}

// Note: block / residence resolution moved into chore.service.getChores
// — we no longer need the local helper since the service does it.
void prisma; // keeps the import alive in case it's used by other handlers

