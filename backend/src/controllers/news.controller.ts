import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as svc from '../services/news.service';

export async function getAll(req: Request, res: Response, next: NextFunction) {
  try {
    const filter = req.query.type as string | undefined;
    res.json({ success: true, data: await svc.getAllNews(filter) });
  } catch (err) { next(err); }
}

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await svc.getNewsById(req.params.id) });
  } catch (err) { next(err); }
}

export async function create(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const item = await svc.createNews(req.user!.userId, req.body);
    res.status(201).json({ success: true, data: item });
  } catch (err) { next(err); }
}

export async function pin(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await svc.togglePin(req.params.id) });
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.deleteNews(req.params.id);
    res.json({ success: true, message: 'News item deleted' });
  } catch (err) { next(err); }
}
