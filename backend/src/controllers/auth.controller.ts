import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';
import { createAuditLog } from '../utils/audit.util';
import { AuthRequest } from '../middleware/auth.middleware';

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.loginUser(req.body);

    await createAuditLog({
      userId: result.user.id as string,
      action: 'LOGIN',
      entity: 'User',
      entityId: result.user.id as string,
      ip: req.ip,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.registerUser(req.body);

    await createAuditLog({
      userId:   result.user.id as string,
      action:   'REGISTER',
      entity:   'User',
      entityId: result.user.id as string,
      ip:       req.ip,
    });

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body;
    const tokens = await authService.refreshTokens(refreshToken);
    res.json({ success: true, data: tokens });
  } catch (err) {
    next(err);
  }
}

export async function logout(_req: Request, res: Response): Promise<void> {
  // JWT is stateless — client discards tokens
  // Future: add token blocklist here if needed
  res.json({ success: true, message: 'Logged out successfully' });
}

export async function getMe(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await authService.getMe(req.user!.userId);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}
