import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as adminService from '../services/admin.service';

// ── Overview ──────────────────────────────────────────────────
export async function getStats(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await adminService.getAdminStats();
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

// ── Occupancy ─────────────────────────────────────────────────
export async function getOccupancy(req: Request, res: Response, next: NextFunction) {
  try {
    const { block, residenceId } = req.query as { block?: string; residenceId?: string };
    const [rooms, blocks] = await Promise.all([
      adminService.getOccupancy(block, residenceId),
      adminService.getBlocks(),
    ]);
    res.json({ success: true, data: { rooms, blocks } });
  } catch (e) { next(e); }
}

// ── Room Setup ─────────────────────────────────────────────────
export async function setupRooms(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.body as {
      // Mixed mode
      blocks?: number;
      mix?: Array<{ type: string; count: number; price: number }>;
      // Legacy mode
      count?: number; type?: string; pricePerRoom?: number;
      // Both modes
      residenceId?: string;
    };
    const VALID_TYPES = ['SINGLE','DOUBLE','TRIPLE','QUAD','STUDIO'] as const;
    type RoomTypeStr = typeof VALID_TYPES[number];

    // Mixed mode
    if (Array.isArray(body.mix) && body.mix.length > 0) {
      const total = body.mix.reduce((s, m) => s + (m.count ?? 0), 0);
      if (total < 1 || total > 500) {
        res.status(400).json({ success: false, error: 'Total room count must be 1–500' });
        return;
      }
      for (const slice of body.mix) {
        if (!VALID_TYPES.includes(slice.type as RoomTypeStr)) {
          res.status(400).json({ success: false, error: `Invalid room type: ${slice.type}` });
          return;
        }
        if (!slice.count || slice.count < 1) {
          res.status(400).json({ success: false, error: `Slice count must be ≥ 1` });
          return;
        }
        if (!slice.price || slice.price < 0) {
          res.status(400).json({ success: false, error: `Each room type needs a price` });
          return;
        }
      }
      const data = await adminService.setupRooms({
        blocks:      Math.max(1, Math.floor(body.blocks ?? 1)),
        mix:         body.mix.map(m => ({ type: m.type as RoomTypeStr, count: Math.floor(m.count), price: m.price })),
        residenceId: body.residenceId,
      });
      res.json({ success: true, data });
      return;
    }

    // Legacy single-type mode
    const { count, type, blocks, pricePerRoom } = body;
    if (!count || count < 1 || count > 500) {
      res.status(400).json({ success: false, error: 'count must be 1–500' });
      return;
    }
    if (!type || !VALID_TYPES.includes(type as RoomTypeStr)) {
      res.status(400).json({ success: false, error: 'Invalid room type' });
      return;
    }
    const data = await adminService.setupRooms({
      count: Math.floor(count),
      type:  type as 'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'QUAD' | 'STUDIO',
      blocks: Math.max(1, Math.min(10, Math.floor(blocks ?? 1))),
      pricePerRoom: Number(pricePerRoom) || 0,
      residenceId: body.residenceId,
    });
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

// ── Allocations ───────────────────────────────────────────────
export async function getAllocations(req: Request, res: Response, next: NextFunction) {
  try {
    const { search } = req.query as { search?: string };
    const data = await adminService.getAllAllocations(search);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

export async function createAllocation(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await adminService.createAllocation(req.body);
    res.status(201).json({ success: true, data });
  } catch (e) { next(e); }
}

export async function updateAllocation(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await adminService.updateAllocation(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

export async function removeAllocation(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await adminService.removeAllocation(req.params.id);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

// ── Accounts ──────────────────────────────────────────────────
export async function getAccounts(req: Request, res: Response, next: NextFunction) {
  try {
    const { search } = req.query as { search?: string };
    const data = await adminService.getAllAccounts(search);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

export async function updateAccount(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await adminService.updateAccount(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

export async function approveAccount(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await adminService.approveAccount(req.params.id);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

export async function setAccountActive(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { isActive } = req.body as { isActive?: boolean };
    if (typeof isActive !== 'boolean') {
      res.status(400).json({ success: false, error: 'isActive (boolean) is required' });
      return;
    }
    const data = await adminService.setAccountActive(req.params.id, isActive, req.user!.userId);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

// ── Rewards ───────────────────────────────────────────────────
export async function getVouchers(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await adminService.getAllVouchers();
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

export async function createVoucher(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await adminService.createVoucher(req.body);
    res.status(201).json({ success: true, data });
  } catch (e) { next(e); }
}

export async function updateVoucher(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await adminService.updateVoucher(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

export async function deleteVoucher(req: Request, res: Response, next: NextFunction) {
  try {
    await adminService.deleteVoucher(req.params.id);
    res.json({ success: true, message: 'Voucher deleted' });
  } catch (e) { next(e); }
}

export async function awardCredits(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await adminService.awardCredits(req.body);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

// ── Revenue Report ────────────────────────────────────────────
export async function getRevenueReport(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await adminService.getRevenueReport();
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

// ── Voucher Claims ────────────────────────────────────────────
export async function getVoucherClaims(req: Request, res: Response, next: NextFunction) {
  try {
    const { status } = req.query as { status?: string };
    const data = await adminService.getVoucherClaims(status);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

export async function approveVoucherClaim(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await adminService.approveVoucherClaim(req.params.id, req.user!.userId);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

export async function rejectVoucherClaim(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { adminNote } = req.body as { adminNote?: string };
    const data = await adminService.rejectVoucherClaim(req.params.id, adminNote);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

// ── Visitor Log ───────────────────────────────────────────────
export async function getVisitorLog(req: Request, res: Response, next: NextFunction) {
  try {
    const { search } = req.query as { search?: string };
    const data = await adminService.getAdminVisitorLog(search);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}
