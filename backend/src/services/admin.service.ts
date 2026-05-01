import prisma from '../config/database';
import { AppError } from '../middleware/error.middleware';
import {
  CreateAllocationInput,
  UpdateAllocationInput,
  UpdateAccountInput,
  CreateVoucherInput,
  UpdateVoucherInput,
  AwardCreditsInput,
} from '../validators/admin.validator';

// ── Overview Stats ─────────────────────────────────────────────
export async function getAdminStats() {
  const [
    totalStudents,
    pendingStudents,
    totalRooms,
    occupiedRooms,
    openTickets,
    urgentTickets,
    totalVisitors,
    todayVisitors,
    totalVouchers,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'ACTIVE_STUDENT' } }),
    prisma.user.count({ where: { role: 'PENDING_STUDENT' } }),
    prisma.room.count(),
    prisma.room.count({ where: { status: 'OCCUPIED' } }),
    prisma.maintenanceTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
    prisma.maintenanceTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] }, priority: 'EMERGENCY' } }),
    prisma.visitorPass.count(),
    prisma.visitorPass.count({
      where: {
        date: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt:  new Date(new Date().setHours(23, 59, 59, 999)),
        },
      },
    }),
    prisma.voucher.count({ where: { isActive: true } }),
  ]);

  // Revenue estimate from active allocations
  const allocations = await prisma.allocation.findMany({
    where: { status: 'ACTIVE' },
    select: { rent: true },
  });
  const monthlyRevenue = allocations.reduce(
    (sum, a) => sum + Number(a.rent),
    0,
  );

  return {
    students:      { total: totalStudents, pending: pendingStudents },
    rooms:         { total: totalRooms, occupied: occupiedRooms, vacant: totalRooms - occupiedRooms },
    maintenance:   { open: openTickets, urgent: urgentTickets },
    visitors:      { total: totalVisitors, today: todayVisitors },
    vouchers:      { active: totalVouchers },
    monthlyRevenue,
    occupancyRate: totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0,
  };
}

// ── Occupancy ─────────────────────────────────────────────────
export async function getOccupancy(block?: string) {
  return prisma.room.findMany({
    where: block ? { block } : undefined,
    include: {
      allocation: {
        include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
      },
    },
    orderBy: [{ block: 'asc' }, { number: 'asc' }],
  });
}

export async function getBlocks() {
  const rooms = await prisma.room.findMany({ select: { block: true }, distinct: ['block'] });
  return rooms.map(r => r.block);
}

// ── Allocations ───────────────────────────────────────────────
export async function getAllAllocations(search?: string) {
  return prisma.allocation.findMany({
    where: search
      ? {
          OR: [
            { user: { name:  { contains: search, mode: 'insensitive' } } },
            { user: { email: { contains: search, mode: 'insensitive' } } },
            { room: { number: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : undefined,
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      room: { select: { id: true, number: true, block: true, type: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createAllocation(data: CreateAllocationInput) {
  // Ensure room is not already actively allocated
  const existing = await prisma.allocation.findUnique({ where: { roomId: data.roomId } });
  if (existing) throw new AppError('Room already has an allocation', 409);

  const allocation = await prisma.allocation.create({
    data: {
      userId:  data.userId,
      roomId:  data.roomId,
      rent:    data.rent,
      status:  (data.status ?? 'ACTIVE') as never,
      moveIn:  data.startDate ? new Date(data.startDate) : new Date(),
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      room: { select: { id: true, number: true, block: true } },
    },
  });

  // Mark room occupied
  if (allocation.status === 'ACTIVE') {
    await prisma.room.update({ where: { id: data.roomId }, data: { status: 'OCCUPIED' } });
  } else {
    await prisma.room.update({ where: { id: data.roomId }, data: { status: 'RESERVED' } });
  }

  return allocation;
}

export async function updateAllocation(id: string, data: UpdateAllocationInput) {
  const allocation = await prisma.allocation.findUnique({ where: { id } });
  if (!allocation) throw new AppError('Allocation not found', 404);

  const updated = await prisma.allocation.update({
    where: { id },
    data: {
      ...(data.rent   !== undefined && { rent:   data.rent }),
      ...(data.status !== undefined && { status: data.status as never }),
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      room: { select: { id: true, number: true, block: true } },
    },
  });

  // Sync room status
  if (data.status === 'ENDED') {
    await prisma.room.update({ where: { id: allocation.roomId }, data: { status: 'VACANT' } });
  } else if (data.status === 'ACTIVE') {
    await prisma.room.update({ where: { id: allocation.roomId }, data: { status: 'OCCUPIED' } });
  } else if (data.status === 'RESERVED') {
    await prisma.room.update({ where: { id: allocation.roomId }, data: { status: 'RESERVED' } });
  }

  return updated;
}

// ── Accounts ──────────────────────────────────────────────────
export async function getAllAccounts(search?: string) {
  return prisma.user.findMany({
    where: search
      ? {
          OR: [
            { name:  { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : undefined,
    select: {
      id:         true,
      name:       true,
      email:      true,
      role:       true,
      phone:      true,
      university: true,
      avatarUrl:  true,
      createdAt:  true,
      wallet:     { select: { credits: true } },
      allocation: {
        select: { room: { select: { number: true, block: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function updateAccount(id: string, data: UpdateAccountInput) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError('User not found', 404);

  return prisma.user.update({
    where: { id },
    data: {
      ...(data.name  && { name:  data.name }),
      ...(data.role  && { role:  data.role as never }),
      ...(data.phone && { phone: data.phone }),
    },
    select: { id: true, name: true, email: true, role: true, phone: true, createdAt: true },
  });
}

// ── Revenue Report ────────────────────────────────────────────
export async function getRevenueReport() {
  // All invoices with user info
  const invoices = await prisma.document.findMany({
    where:   { type: 'INVOICE' },
    include: { user: { select: { id: true, name: true, email: true, allocation: { select: { rent: true } } } } },
    orderBy: { createdAt: 'desc' },
  });

  // Monthly buckets
  const monthMap = new Map<string, { expected: number; cleared: number; submitted: number; pending: number }>();
  for (const inv of invoices) {
    const key = inv.period; // e.g. "April 2026"
    if (!monthMap.has(key)) monthMap.set(key, { expected: 0, cleared: 0, submitted: 0, pending: 0 });
    const bucket  = monthMap.get(key)!;
    const amount  = Number(inv.amount?.replace(/[^0-9.]/g, '') ?? 0);
    bucket.expected += amount;
    if (inv.proofStatus === 'CLEARED') bucket.cleared   += amount;
    if (inv.proofStatus === 'SUBMITTED') bucket.submitted += amount;
    if (!inv.proofStatus || inv.proofStatus === 'REJECTED') bucket.pending += amount;
  }

  // Active allocations → monthly expected revenue
  const activeAllocs = await prisma.allocation.findMany({
    where:   { status: 'ACTIVE' },
    select:  { rent: true, user: { select: { name: true, email: true } }, room: { select: { number: true, block: true } } },
  });
  const projectedMonthly = activeAllocs.reduce((s, a) => s + Number(a.rent), 0);

  // Late payers: invoices that are Overdue or Pending (not CLEARED) older than 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const latePayers = invoices.filter(
    inv => (inv.status === 'Overdue' || inv.status === 'Pending') &&
           inv.proofStatus !== 'CLEARED' &&
           new Date(inv.createdAt) < thirtyDaysAgo,
  );

  return {
    monthlyBreakdown: Array.from(monthMap.entries()).map(([period, v]) => ({ period, ...v })),
    projectedMonthly,
    latePayers: latePayers.map(inv => ({
      id:          inv.id,
      period:      inv.period,
      amount:      inv.amount,
      status:      inv.status,
      proofStatus: inv.proofStatus,
      user:        inv.user,
      createdAt:   inv.createdAt,
    })),
    totalActiveStudents: activeAllocs.length,
  };
}

// ── Rewards / Vouchers ────────────────────────────────────────
export async function getAllVouchers() {
  return prisma.voucher.findMany({
    orderBy: { cost: 'asc' },
    include: { _count: { select: { claims: true } } },
  });
}

export async function createVoucher(data: CreateVoucherInput) {
  return prisma.voucher.create({ data: { ...data, isActive: true } });
}

export async function updateVoucher(id: string, data: UpdateVoucherInput) {
  const voucher = await prisma.voucher.findUnique({ where: { id } });
  if (!voucher) throw new AppError('Voucher not found', 404);
  return prisma.voucher.update({ where: { id }, data });
}

export async function deleteVoucher(id: string) {
  const voucher = await prisma.voucher.findUnique({ where: { id } });
  if (!voucher) throw new AppError('Voucher not found', 404);
  return prisma.voucher.delete({ where: { id } });
}

export async function awardCredits(data: AwardCreditsInput) {
  const user = await prisma.user.findUnique({ where: { id: data.userId } });
  if (!user) throw new AppError('User not found', 404);

  return prisma.$transaction(async (tx) => {
    let wallet = await tx.wallet.findUnique({ where: { userId: data.userId } });
    if (!wallet) {
      wallet = await tx.wallet.create({ data: { userId: data.userId, credits: 0 } });
    }

    await tx.wallet.update({
      where: { userId: data.userId },
      data: { credits: { increment: data.amount } },
    });

    return tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type:     'ADJUST',
        amount:   data.amount,
        note:     data.note,
      },
    });
  });
}

// ── Voucher Claims (task-based vouchers) ──────────────────────
export async function getVoucherClaims(status?: string) {
  return prisma.voucherClaim.findMany({
    where: status ? { status } : undefined,
    include: {
      voucher: { select: { id: true, name: true, icon: true, cost: true, pin: true, imageUrl: true } },
      user:    { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function approveVoucherClaim(claimId: string, adminId: string) {
  const claim = await prisma.voucherClaim.findUnique({
    where:   { id: claimId },
    include: { voucher: true, user: { include: { wallet: true } } },
  });
  if (!claim)                    throw new AppError('Claim not found', 404);
  if (claim.status !== 'PENDING') throw new AppError('Claim already processed', 409);

  return prisma.$transaction(async (tx) => {
    // Update claim status
    await tx.voucherClaim.update({
      where: { id: claimId },
      data:  { status: 'APPROVED', approvedBy: adminId, approvedAt: new Date() },
    });

    // Award credits
    let wallet = await tx.wallet.findUnique({ where: { userId: claim.userId } });
    if (!wallet) wallet = await tx.wallet.create({ data: { userId: claim.userId, credits: 0 } });

    await tx.wallet.update({
      where: { userId: claim.userId },
      data:  { credits: { increment: claim.voucher.cost } },
    });

    return tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type:     'EARN',
        amount:   claim.voucher.cost,
        note:     `Task approved: ${claim.voucher.name}`,
      },
    });
  });
}

export async function rejectVoucherClaim(claimId: string, adminNote?: string) {
  const claim = await prisma.voucherClaim.findUnique({ where: { id: claimId } });
  if (!claim)                    throw new AppError('Claim not found', 404);
  if (claim.status !== 'PENDING') throw new AppError('Claim already processed', 409);

  return prisma.voucherClaim.update({
    where: { id: claimId },
    data:  { status: 'REJECTED', adminNote: adminNote ?? null },
  });
}

// ── Admin Visitor Log ─────────────────────────────────────────
export async function getAdminVisitorLog(search?: string) {
  return prisma.visitorPass.findMany({
    where: search
      ? {
          OR: [
            { visitorName: { contains: search, mode: 'insensitive' } },
            { host: { name: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : undefined,
    include: {
      host: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
    orderBy: { date: 'desc' },
    take: 200,
  });
}
