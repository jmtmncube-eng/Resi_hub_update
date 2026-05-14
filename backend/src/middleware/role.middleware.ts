import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';

// ── Semantic role groups ───────────────────────────────────────
// Spread into requireRole(...) so route guards read by intent and the
// staff-role permission model lives in one place rather than scattered
// across literal role lists.
//
//   ADMIN_ONLY  — owner-only: residence settings, the audit log,
//                 anything that could escalate privileges.
//   MANAGEMENT  — owner + deputy: all day-to-day operational admin
//                 (accounts, payments, news, visitors, chores, rooms…).
//   OPS_STAFF   — management + the maintenance handyman: maintenance
//                 tickets and ops-service logs.
export const ADMIN_ONLY = ['ADMIN'] as const;
export const MANAGEMENT = ['ADMIN', 'MANAGER'] as const;
export const OPS_STAFF  = ['ADMIN', 'MANAGER', 'MAINTENANCE'] as const;

/**
 * Restrict a route to specific roles.
 * Usage: router.get('/admin', authenticate, requireRole('ADMIN'), handler)
 *        router.use(authenticate, requireRole(...MANAGEMENT))
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
