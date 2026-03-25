import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';

/**
 * Restrict a route to specific roles.
 * Usage: router.get('/admin', authenticate, requireRole('ADMIN'), handler)
 */
export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: `Access denied. Required role: ${roles.join(' or ')}`,
      });
      return;
    }

    next();
  };
}
