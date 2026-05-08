import { Response, NextFunction } from 'express';
import { AuthRequest }            from '../middleware/auth.middleware';
import * as service               from '../services/application.service';

export async function getStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await service.getApplicationStatus(req.user!.userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getRooms(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await service.getAvailableRooms();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function selectRoom(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { roomId } = req.body as { roomId?: string };
    if (!roomId) { res.status(400).json({ success: false, error: 'roomId required' }); return; }
    const data = await service.selectRoom(req.user!.userId, roomId);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// ── Submit application (student) ───────────────────────────────
export async function submit(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await service.submitApplication(req.user!.userId, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// ── Admin: list submitted applications ─────────────────────────
export async function listSubmitted(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await service.listSubmittedApplications();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// ── Admin: approve / reject ────────────────────────────────────
export async function decide(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { decision, note } = req.body as { decision?: 'APPROVED' | 'REJECTED'; note?: string };
    if (decision !== 'APPROVED' && decision !== 'REJECTED') {
      res.status(400).json({ success: false, error: 'decision must be APPROVED or REJECTED' });
      return;
    }
    const data = await service.decideApplication(req.params.id, decision, note);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
