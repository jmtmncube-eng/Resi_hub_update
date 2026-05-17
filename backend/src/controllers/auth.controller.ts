import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';
import * as passwordReset from '../services/passwordReset.service';
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

export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await passwordReset.requestReset(req.body.email);
    // Always return success — don't leak whether the email exists.
    res.json({ success: true, message: 'If that email is registered, a reset link has been sent.' });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await passwordReset.resetPassword(req.body.token, req.body.password);
    res.json({ success: true, message: 'Password updated. You can now sign in with your new password.' });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await authService.getMe(req.user!.userId);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}
