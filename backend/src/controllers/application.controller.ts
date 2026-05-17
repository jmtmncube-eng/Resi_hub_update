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

// ── Compliance docs — any authenticated student ────────────────
export async function getMyDocs(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await service.getMyApplicationDocs(req.user!.userId) });
  } catch (err) {
    next(err);
  }
}

export async function uploadDoc(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { type, fileUrl } = req.body as { type?: string; fileUrl?: string };
    if (!type || !fileUrl) {
      res.status(400).json({ success: false, error: 'type + fileUrl required' });
      return;
    }
    res.status(201).json({ success: true, data: await service.uploadApplicationDoc(req.user!.userId, type, fileUrl) });
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

// ── Admin: set a compliance doc's expiry date ──────────────────
export async function setDocExpiry(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { expiresAt } = req.body as { expiresAt?: string | null };
    const data = await service.setDocExpiry(req.params.docId, expiresAt ?? null);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// ── Admin: list compliance docs awaiting review (per-doc, not whole-app) ──
export async function listDocsToReview(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await service.listDocsAwaitingReview() });
  } catch (err) {
    next(err);
  }
}

// ── Admin: per-doc approve / reject (with rejection reason) ────
export async function decideDoc(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { decision, note } = req.body as { decision?: 'APPROVED' | 'REJECTED'; note?: string };
    if (decision !== 'APPROVED' && decision !== 'REJECTED') {
      res.status(400).json({ success: false, error: 'decision must be APPROVED or REJECTED' });
      return;
    }
    const data = await service.decideDocument(req.params.docId, decision, req.user!.userId, note);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// ── Admin: nudge a student to upload missing compliance doc(s) ──
export async function remindDocs(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { types } = req.body as { types?: string[] };
    if (!types || !Array.isArray(types)) {
      res.status(400).json({ success: false, error: 'types[] required' });
      return;
    }
    const data = await service.sendComplianceReminder(req.params.userId, types);
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
