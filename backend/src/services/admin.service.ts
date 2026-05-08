import prisma from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { ensureContractForUser, initiateRentInvoice } from './document.service';
import { sendEmail } from './email.service';
import { createAuditLog } from '../utils/audit.util';

/** Build the YYYY-MM period string for "next month from today". Used so a
 *  freshly-activated student lands with their upcoming-month invoice
 *  ready to pay rather than this-month back-dated. */
function nextMonthPeriod(): string {
  const now  = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
}
import {
  CreateAllocationInput,
  UpdateAllocationInput,
  UpdateAccountInput,
  CreateVoucherInput,
  UpdateVoucherInput,
  AwardCreditsInput,
} from '../validators/admin.validator';

// ── Overview Stats ─────────────────────────────────────────────
/**
 * KPIs for the admin dashboard. Scopes to a single residence when
 * `residenceId` is provided; rolls up the entire portfolio otherwise.
 *
 * Visitors and vouchers stay portfolio-wide (no residenceId on those models).
 * Rooms / occupancy / tickets / revenue / students all narrow correctly.
 */
export async function getAdminStats(residenceId?: string) {
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
    prisma.user.count({
      where: residenceId
        ? { role: 'ACTIVE_STUDENT',  allocation: { is: { room: { is: { residenceId } } } } }
        : { role: 'ACTIVE_STUDENT' },
    }),
    // Pending students don't have an allocation yet — keep portfolio-wide
    prisma.user.count({ where: { role: 'PENDING_STUDENT' } }),
    prisma.room.count({ where: residenceId ? { residenceId } : undefined }),
    prisma.room.count({ where: residenceId ? { residenceId, status: 'OCCUPIED' } : { status: 'OCCUPIED' } }),
    prisma.maintenanceTicket.count({
      where: residenceId
        ? { residenceId, status: { in: ['OPEN', 'IN_PROGRESS'] } }
        : {                status: { in: ['OPEN', 'IN_PROGRESS'] } },
    }),
    prisma.maintenanceTicket.count({
      where: residenceId
        ? { residenceId, status: { in: ['OPEN', 'IN_PROGRESS'] }, priority: { in: ['HIGH', 'EMERGENCY'] } }
        : {                status: { in: ['OPEN', 'IN_PROGRESS'] }, priority: { in: ['HIGH', 'EMERGENCY'] } },
    }),
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

  // Revenue estimate from active allocations (scoped via the room → residence FK)
  const allocations = await prisma.allocation.findMany({
    where: {
      status: 'ACTIVE',
      ...(residenceId ? { room: { residenceId } } : {}),
    },
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

// ─────────────────────────────────────────────────────────────────
// Room status helpers — rooms can now hold multiple tenants
// ─────────────────────────────────────────────────────────────────

const TYPE_CAPACITY: Record<string, number> = {
  SINGLE: 1, DOUBLE: 2, TRIPLE: 3, QUAD: 4, STUDIO: 1,
};

/** Recompute a room's status from its current allocations.
 *  - All slots filled with ACTIVE  → OCCUPIED
 *  - Any allocation present (ACTIVE or RESERVED) but slots remain → RESERVED
 *  - No active or reserved allocations → VACANT */
async function recomputeRoomStatus(roomId: string): Promise<void> {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      allocations: { where: { status: { in: ['ACTIVE', 'RESERVED'] } } },
    },
  });
  if (!room) return;

  const total    = room.allocations.length;
  const active   = room.allocations.filter(a => a.status === 'ACTIVE').length;
  const capacity = room.capacity || TYPE_CAPACITY[room.type] || 1;

  let next: 'VACANT' | 'RESERVED' | 'OCCUPIED' = 'VACANT';
  if (total === 0)                              next = 'VACANT';
  else if (active >= capacity)                  next = 'OCCUPIED';
  else                                          next = 'RESERVED';

  if (next !== room.status) {
    await prisma.room.update({ where: { id: roomId }, data: { status: next } });
  }
}

// ── Occupancy ─────────────────────────────────────────────────
export async function getOccupancy(block?: string, residenceId?: string) {
  const where: Record<string, unknown> = {};
  if (block)       where.block = block;
  if (residenceId) where.residenceId = residenceId;

  const rooms = await prisma.room.findMany({
    where,
    include: {
      allocations: {
        where:   { status: { in: ['ACTIVE', 'RESERVED'] } },
        include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: [{ block: 'asc' }, { number: 'asc' }],
  });

  // Shape each room for the frontend grid: include capacity, occupied slots,
  // a tenants array, and a back-compat single `allocation` field for the
  // original "first tenant" UI that still references it.
  return rooms.map(r => {
    const tenants = r.allocations.map(a => ({
      allocationId: a.id,
      status:       a.status,
      rent:         Number(a.rent),
      moveIn:       a.moveIn,
      user:         a.user,
    }));
    const occupied  = tenants.filter(t => t.status === 'ACTIVE').length;
    const reserved  = tenants.filter(t => t.status === 'RESERVED').length;
    const capacity  = r.capacity || TYPE_CAPACITY[r.type] || 1;
    return {
      id: r.id, number: r.number, block: r.block, type: r.type,
      price: r.price, status: r.status,
      capacity, occupied, reserved,
      vacantSlots: capacity - tenants.length,
      tenants,
      // Back-compat: first tenant only (existing UIs that read .allocation)
      allocation: tenants[0]
        ? { id: tenants[0].allocationId, status: tenants[0].status, rent: tenants[0].rent, user: tenants[0].user }
        : null,
    };
  });
}

export async function getBlocks() {
  const rooms = await prisma.room.findMany({ select: { block: true }, distinct: ['block'] });
  return rooms.map(r => r.block);
}

// ── Room Setup ─────────────────────────────────────────────────
const BLOCK_LETTERS = ['A','B','C','D','E','F','G','H','J','K'];

type RoomTypeStr = 'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'QUAD' | 'STUDIO';

interface SetupRoomsLegacy {
  count:        number;
  type:         RoomTypeStr;
  blocks:       number;
  pricePerRoom: number;
  residenceId?: string;
}

interface SetupRoomsMixed {
  blocks:       number;
  mix:          Array<{ type: RoomTypeStr; count: number; price: number }>;
  residenceId?: string;
}

/**
 * Generate rooms. Two modes:
 * - **Legacy**: one type per call (used by simple "X rooms of type Y" wizard)
 * - **Mixed**: `mix` array → e.g. 5 SINGLEs + 4 DOUBLEs + 2 QUADs in one go.
 *   Rooms are interleaved across blocks so each block ends up with a balanced
 *   mix instead of all the singles in Block A and all the doubles in Block B.
 */
export async function setupRooms(args: SetupRoomsLegacy | SetupRoomsMixed) {
  // Only remove rooms with NO allocations of any kind, scoped to the
  // residence we're setting up. Rooms that still hold (or once held)
  // tenants stay — we never nuke history.
  await prisma.room.deleteMany({
    where: {
      status:      'VACANT',
      allocations: { none: {} },
      ...(args.residenceId ? { residenceId: args.residenceId } : {}),
    },
  });

  // Normalise both shapes into a flat list of (type, price) entries
  const flat: Array<{ type: RoomTypeStr; price: number }> = [];
  if ('mix' in args) {
    for (const slice of args.mix) {
      for (let i = 0; i < slice.count; i++) flat.push({ type: slice.type, price: slice.price });
    }
  } else {
    for (let i = 0; i < args.count; i++) flat.push({ type: args.type, price: args.pricePerRoom });
  }

  const blocks = Math.max(1, args.blocks);

  // Seed each block's counter from the highest existing room number in that
  // block so we never collide with rooms that survived the cleanup above.
  const surviving = await prisma.room.findMany({ select: { block: true, number: true } });
  const counters: Record<string, number> = {};
  for (const room of surviving) {
    const tail = parseInt(room.number.replace(/^[A-Z]+/, ''), 10);
    if (Number.isFinite(tail)) {
      counters[room.block] = Math.max(counters[room.block] ?? 100, tail);
    }
  }

  const toCreate: Array<{
    number: string; block: string; type: RoomTypeStr; price: number;
    capacity: number; status: 'VACANT'; residenceId: string | null;
  }> = [];

  for (let i = 0; i < flat.length; i++) {
    const letter = BLOCK_LETTERS[i % blocks] ?? String.fromCharCode(65 + (i % blocks));
    counters[letter] = (counters[letter] ?? 100) + 1;
    const { type, price } = flat[i];
    toCreate.push({
      number:      `${letter}${counters[letter]}`,
      block:       letter,
      type,
      price,
      residenceId: args.residenceId ?? null,
      capacity: TYPE_CAPACITY[type] ?? 1,
      status:   'VACANT',
    });
  }

  await prisma.room.createMany({ data: toCreate });
  return getOccupancy();
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
  // The user can only have one current allocation
  const userExisting = await prisma.allocation.findUnique({ where: { userId: data.userId } });
  if (userExisting) throw new AppError('This student already has a room allocation', 409);

  // Capacity check — count existing ACTIVE/RESERVED allocations against capacity
  const room = await prisma.room.findUnique({
    where: { id: data.roomId },
    include: { allocations: { where: { status: { in: ['ACTIVE', 'RESERVED'] } } } },
  });
  if (!room) throw new AppError('Room not found', 404);
  const capacity = room.capacity || TYPE_CAPACITY[room.type] || 1;
  if (room.allocations.length >= capacity) {
    throw new AppError(`Room is full (${room.allocations.length}/${capacity})`, 409);
  }

  const allocation = await prisma.allocation.create({
    data: {
      userId:  data.userId,
      roomId:  data.roomId,
      rent:    data.rent,
      status:  (data.status ?? 'ACTIVE') as never,
      moveIn:  data.startDate ? new Date(data.startDate) : new Date(),
      electricitySelfManaged: data.electricitySelfManaged ?? false,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      room: { select: { id: true, number: true, block: true } },
    },
  });

  await recomputeRoomStatus(data.roomId);
  // Auto-provision contract + first invoice so the student lands fully set up
  if (allocation.status === 'ACTIVE') {
    await Promise.all([
      ensureContractForUser(data.userId).catch(() => { /* non-fatal */ }),
      initiateRentInvoice(data.userId, nextMonthPeriod()).catch(() => { /* non-fatal */ }),
    ]);
  }
  return allocation;
}

/**
 * Move a student from their current room to a new one. Wraps remove +
 * recreate in a single transaction so we never leave the user halfway
 * between rooms. The audit trail preserves the move via two AuditLog
 * entries (REMOVED + CREATED).
 *
 * Use this whenever you'd otherwise need to delete-then-create an
 * allocation — it handles the rare race where two admins try to move
 * the same student into different rooms simultaneously.
 */
export async function moveAllocation(args: {
  userId: string; targetRoomId: string; rent: number;
  status?: 'ACTIVE' | 'RESERVED';
}) {
  const user = await prisma.user.findUnique({
    where:   { id: args.userId },
    include: { allocation: true },
  });
  if (!user)             throw new AppError('User not found', 404);
  if (!user.allocation)  throw new AppError('Student has no current allocation', 400);
  if (user.allocation.roomId === args.targetRoomId) {
    throw new AppError('Student is already in that room', 400);
  }

  const target = await prisma.room.findUnique({
    where:   { id: args.targetRoomId },
    include: { allocations: { where: { status: { in: ['ACTIVE', 'RESERVED'] } } } },
  });
  if (!target) throw new AppError('Target room not found', 404);
  const capacity = target.capacity || TYPE_CAPACITY[target.type] || 1;
  if (target.allocations.length >= capacity) {
    throw new AppError(`Target room is full (${target.allocations.length}/${capacity})`, 409);
  }

  const oldRoomId = user.allocation.roomId;
  await prisma.$transaction(async (tx) => {
    // Delete (not just end) so the unique-on-userId constraint frees up
    await tx.allocation.delete({ where: { id: user.allocation!.id } });
    await tx.allocation.create({
      data: {
        userId:  args.userId,
        roomId:  args.targetRoomId,
        rent:    args.rent,
        status:  args.status ?? 'ACTIVE',
        moveIn:  user.allocation!.moveIn ?? new Date(),
      },
    });
  });

  await Promise.all([recomputeRoomStatus(oldRoomId), recomputeRoomStatus(args.targetRoomId)]);
  return prisma.user.findUnique({
    where:   { id: args.userId },
    include: { allocation: { include: { room: true } } },
  });
}

/**
 * Admin removes a student from a room. We end the allocation rather than
 * delete it so historical records are preserved (for audits, ended-leases
 * reporting, etc.). The user.allocation FK is unique, so to let them be
 * re-allocated later we hard-delete; ENDED allocations would block that.
 */
export async function removeAllocation(id: string) {
  const alloc = await prisma.allocation.findUnique({ where: { id } });
  if (!alloc) throw new AppError('Allocation not found', 404);

  await prisma.allocation.delete({ where: { id } });
  await recomputeRoomStatus(alloc.roomId);
  return { id, roomId: alloc.roomId };
}

export async function updateAllocation(id: string, data: UpdateAllocationInput) {
  const allocation = await prisma.allocation.findUnique({ where: { id } });
  if (!allocation) throw new AppError('Allocation not found', 404);

  const updated = await prisma.allocation.update({
    where: { id },
    data: {
      ...(data.rent                   !== undefined && { rent:   data.rent }),
      ...(data.status                 !== undefined && { status: data.status as never }),
      ...(data.electricitySelfManaged !== undefined && { electricitySelfManaged: data.electricitySelfManaged }),
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      room: { select: { id: true, number: true, block: true } },
    },
  });

  // Recompute the room's status from its (possibly multiple) tenants
  await recomputeRoomStatus(allocation.roomId);

  // RESERVED → ACTIVE: same contract + first-invoice guarantee as a fresh
  // allocation so admins don't have to remember to bill the student.
  if (data.status === 'ACTIVE') {
    await Promise.all([
      ensureContractForUser(allocation.userId).catch(() => { /* non-fatal */ }),
      initiateRentInvoice(allocation.userId, nextMonthPeriod()).catch(() => { /* non-fatal */ }),
    ]);
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
      program:    true,
      year:       true,
      bio:        true,
      avatarUrl:  true,
      isActive:   true,
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

  // Email uniqueness guard if it's changing
  if (data.email && data.email !== user.email) {
    const clash = await prisma.user.findUnique({ where: { email: data.email } });
    if (clash) throw new AppError('That email is already in use', 409);
  }

  return prisma.user.update({
    where: { id },
    data: {
      ...(data.name  !== undefined && { name:  data.name }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.role  !== undefined && { role:  data.role as never }),
      ...(data.phone !== undefined && { phone: data.phone || null }),
      ...(data.university !== undefined && { university: data.university || null }),
      ...(data.program    !== undefined && { program:    data.program    || null }),
      ...(data.year       !== undefined && { year:       data.year ?? null }),
      ...(data.bio        !== undefined && { bio:        data.bio || null }),
    },
    select: {
      id: true, name: true, email: true, role: true, phone: true,
      university: true, program: true, year: true, bio: true,
      avatarUrl: true, createdAt: true,
    },
  });
}

/**
 * Single-call overview for the admin "view student" drawer:
 * profile, allocation, room, residence, recent invoices/payments,
 * wallet, ticket + visitor counts, application status. Everything
 * the admin needs to triage a student in one place.
 */
export async function getAccountOverview(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, name: true, email: true, phone: true, role: true,
      avatarUrl: true, isActive: true,
      university: true, program: true, year: true, bio: true,
      idNumber: true, applicationStatus: true,
      applicationSubmittedAt: true, applicationApprovedAt: true,
      applicationRejectedAt: true, applicationAdminNote: true,
      onboardedAt: true, createdAt: true,
      wallet: { select: { credits: true } },
      allocation: {
        select: {
          id: true, status: true, moveIn: true, rent: true, balance: true, createdAt: true,
          room: {
            select: {
              id: true, number: true, block: true, type: true, capacity: true, price: true,
              residence: { select: { id: true, name: true } },
            },
          },
        },
      },
      documents: {
        where: { type: { in: ['INVOICE', 'CONTRACT'] } },
        orderBy: { createdAt: 'desc' },
        take: 12,
        select: {
          id: true, type: true, period: true, amount: true, status: true,
          proofStatus: true, signedAt: true, clearedAt: true, createdAt: true,
        },
      },
    },
  });
  if (!user) throw new AppError('User not found', 404);

  const [openTickets, totalTickets, upcomingPasses, totalPasses] = await Promise.all([
    prisma.maintenanceTicket.count({ where: { studentId: id, status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
    prisma.maintenanceTicket.count({ where: { studentId: id } }),
    prisma.visitorPass.count({ where: { hostId: id, status: 'UPCOMING' } }),
    prisma.visitorPass.count({ where: { hostId: id } }),
  ]);

  // Quick-summary: months unpaid, total paid year-to-date
  const invoices = user.documents.filter(d => d.type === 'INVOICE');
  const monthsUnpaid = invoices.filter(i => i.status !== 'Paid').length;
  const monthsPaid   = invoices.filter(i => i.status === 'Paid').length;

  return {
    ...user,
    stats: {
      openTickets,
      totalTickets,
      upcomingPasses,
      totalPasses,
      monthsUnpaid,
      monthsPaid,
    },
  };
}

/**
 * Create a single room. Lets admin add rooms one-at-a-time without
 * having to re-run the bulk generator (which nukes vacant rooms).
 * Validates uniqueness on the room number within the residence.
 */
export async function createSingleRoom(data: {
  number: string; block: string; type: string;
  capacity?: number; price: number; residenceId?: string;
}) {
  const number = data.number.trim().toUpperCase();
  const block  = data.block.trim().toUpperCase();
  if (!number) throw new AppError('Room number is required', 400);
  if (!block)  throw new AppError('Block is required', 400);
  if (!['SINGLE','DOUBLE','TRIPLE','QUAD','STUDIO'].includes(data.type)) {
    throw new AppError('Invalid room type', 400);
  }
  if (data.price < 0) throw new AppError('Price must be ≥ 0', 400);

  // Uniqueness — schema enforces global uniqueness on number, so just check.
  const existing = await prisma.room.findUnique({ where: { number } });
  if (existing) {
    throw new AppError(`Room ${number} already exists`, 409);
  }

  const capacity = data.capacity ?? (TYPE_CAPACITY[data.type as RoomTypeStr] ?? 1);

  return prisma.room.create({
    data: {
      number, block,
      type: data.type as RoomTypeStr,
      price: data.price,
      capacity,
      status: 'VACANT',
      residenceId: data.residenceId ?? null,
    },
  });
}

/**
 * Hard-delete a single room. Refuses if it has any allocations of any
 * status — admins must end/move the tenants first. Recomputes nothing
 * because the room is gone after this.
 */
export async function deleteRoom(id: string) {
  const room = await prisma.room.findUnique({
    where:   { id },
    include: { allocations: true },
  });
  if (!room) throw new AppError('Room not found', 404);
  if (room.allocations.length > 0) {
    throw new AppError(
      `Can't delete — room has ${room.allocations.length} tenant${room.allocations.length === 1 ? '' : 's'}. Remove or move them first.`,
      409,
    );
  }
  await prisma.room.delete({ where: { id } });
  return { id, number: room.number };
}

/** Toggle a user's active flag. Deactivated users cannot log in. */
export async function setAccountActive(id: string, isActive: boolean, adminId: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError('User not found', 404);
  if (user.id === adminId) throw new AppError("You can't deactivate your own account", 400);
  if (user.role === 'ADMIN' && !isActive) {
    // Belt-and-braces: prevent locking out the last admin
    const otherActiveAdmins = await prisma.user.count({
      where: { role: 'ADMIN', isActive: true, id: { not: id } },
    });
    if (otherActiveAdmins === 0) {
      throw new AppError('Cannot deactivate the only active admin', 400);
    }
  }
  const result = await prisma.user.update({
    where:  { id },
    data:   { isActive },
    select: { id: true, name: true, isActive: true, role: true },
  });

  // Notify on deactivation only — reactivation is silent
  if (!isActive) {
    sendEmail({
      to:       user.email,
      template: 'accountDeactivated',
      data:     { name: user.name },
    }).catch(() => { /* logged inside */ });
  }

  void createAuditLog({
    userId: adminId,
    action: isActive ? 'ACCOUNT_REACTIVATED' : 'ACCOUNT_DEACTIVATED',
    entity: 'User', entityId: id,
    meta: { targetName: user.name, targetEmail: user.email },
  });

  return result;
}

/** One-click approve: PENDING_STUDENT → ACTIVE_STUDENT. If they already
 *  have a RESERVED allocation we promote it to ACTIVE and auto-provision
 *  their lease contract + first rent invoice so they land fully set up. */
export async function approveAccount(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: { allocation: true },
  });
  if (!user) throw new AppError('User not found', 404);
  if (user.role === 'ACTIVE_STUDENT') throw new AppError('Already an active student', 400);
  if (user.role === 'ADMIN')          throw new AppError('Cannot change admin role this way', 400);

  const updated = await prisma.user.update({
    where: { id },
    data:  { role: 'ACTIVE_STUDENT' as never },
    select: { id: true, name: true, role: true },
  });

  // If they reserved a room during onboarding, activate that allocation
  // and provision the contract + upcoming-month invoice.
  if (user.allocation && user.allocation.status === 'RESERVED') {
    await prisma.allocation.update({
      where: { id: user.allocation.id },
      data:  { status: 'ACTIVE', moveIn: user.allocation.moveIn ?? new Date() },
    });
    await recomputeRoomStatus(user.allocation.roomId);
    await Promise.all([
      ensureContractForUser(id).catch(() => { /* non-fatal */ }),
      initiateRentInvoice(id, nextMonthPeriod()).catch(() => { /* non-fatal */ }),
    ]);
  }

  // Email — best-effort; never blocks the response
  sendEmail({
    to:       user.email,
    template: 'accountApproved',
    data:     { name: user.name },
  }).catch(() => { /* logged inside sendEmail */ });

  // Audit trail
  void createAuditLog({
    userId: id, action: 'ACCOUNT_APPROVED', entity: 'User', entityId: id,
    meta: { name: user.name, hadReservedRoom: !!user.allocation },
  });

  return updated;
}

// ── Revenue Report ────────────────────────────────────────────
export async function getRevenueReport(residenceId?: string) {
  // All invoices with user info, scoped via the user's allocation room.residenceId
  const invoices = await prisma.document.findMany({
    where:   {
      type: 'INVOICE',
      ...(residenceId ? { user: { allocation: { is: { room: { is: { residenceId } } } } } } : {}),
    },
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
    where: {
      status: 'ACTIVE',
      ...(residenceId ? { room: { residenceId } } : {}),
    },
    select: { rent: true, user: { select: { name: true, email: true } }, room: { select: { number: true, block: true } } },
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
