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

// ── Rewards / Vouchers ────────────────────────────────────────
export async function getAllVouchers() {
  return prisma.voucher.findMany({ orderBy: { cost: 'asc' } });
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
