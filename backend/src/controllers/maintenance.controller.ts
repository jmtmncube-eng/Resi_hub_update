import { Response, NextFunction, Request } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as svc from '../services/maintenance.service';

export async function getMyTickets(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await svc.getMyTickets(req.user!.userId) });
  } catch (err) { next(err); }
}

export async function getTicket(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ticket = await svc.getTicketById(req.params.id, req.user!.userId, req.user!.role);
    res.json({ success: true, data: ticket });
  } catch (err) { next(err); }
}

export async function createTicket(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const mediaUrls = (req.files as Express.Multer.File[] | undefined)?.map(f => `/uploads/${f.filename}`) ?? [];
    const ticket = await svc.createTicket(req.user!.userId, req.body, mediaUrls);
    res.status(201).json({ success: true, data: ticket });
  } catch (err) { next(err); }
}

export async function updateTicket(req: Request, res: Response, next: NextFunction) {
  try {
    const ticket = await svc.updateTicket(req.params.id, req.body);
    res.json({ success: true, data: ticket });
  } catch (err) { next(err); }
}

export async function getAllTickets(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, priority, search } = req.query as Record<string, string>;
    res.json({ success: true, data: await svc.getAllTickets({ status, priority, search }) });
  } catch (err) { next(err); }
}
