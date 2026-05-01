import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as svc from '../services/chore.service';
import prisma from '../config/database';

export async function getChores(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    // Default to user's block, or query param
    const block = (req.query.block as string) || await getUserBlock(req.user!.userId);
    res.json({ success: true, data: await svc.getChores(block) });
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

async function getUserBlock(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { allocation: { include: { room: true } } },
  });
  return user?.allocation?.room?.block ?? 'Block A';
}
