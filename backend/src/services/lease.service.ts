import prisma from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { recomputeRoomStatus } from './admin.service';
import { createNotification } from './notification.service';
import { persistIfDataUrl } from './storage.service';
import type { InspectionType } from '@prisma/client';

// ============================================================
//  Lease lifecycle service
// ============================================================
//  The "lease" lives on the Allocation row (term dates, deposit,
//  move-out tracking). Inspections are a separate model tied to the
//  allocation. This service owns every lifecycle transition:
//  set terms → record deposit → renew → give notice → schedule
//  move-out → complete move-out (frees the room) → refund deposit.
//
//  Student-facing reads are scoped to the caller's own allocation;
//  every mutation is admin/manager-only (enforced at the route).
// ============================================================

const LEASE_SELECT = {
  id: true, status: true, moveIn: true, rent: true, balance: true,
  leaseStart: true, leaseEnd: true,
  depositAmount: true, depositStatus: true, depositRefunded: true, depositNote: true,
  noticeGivenAt: true, moveOutDate: true, moveOutCompletedAt: true,
  createdAt: true,
  room: {
    select: {
      id: true, number: true, block: true, type: true, price: true,
      residence: { select: { id: true, name: true } },
    },
  },
  inspections: {
    orderBy: { inspectedAt: 'desc' as const },
    select: {
      id: true, type: true, inspectedAt: true, condition: true,
      notes: true, photoUrls: true, inspectorId: true, createdAt: true,
    },
  },
} as const;

/** Load an allocation with the full lease view, or throw 404. */
async function loadLease(allocationId: string) {
  const alloc = await prisma.allocation.findUnique({
    where:  { id: allocationId },
    select: { ...LEASE_SELECT, userId: true },
  });
  if (!alloc) throw new AppError('Allocation not found', 404);
  return alloc;
}

/** The signed-in student's own lease (or null if they have no allocation). */
export async function getMyLease(userId: string) {
  return prisma.allocation.findUnique({
    where:  { userId },
    select: LEASE_SELECT,
  });
}

/** Admin: the lease behind a specific allocation. */
export async function getLease(allocationId: string) {
  return loadLease(allocationId);
}

/** Admin: set / adjust the lease term dates. */
export async function updateLeaseTerms(
  allocationId: string,
  data: { leaseStart?: string | null; leaseEnd?: string | null },
) {
  await loadLease(allocationId);
  const leaseStart = data.leaseStart ? new Date(data.leaseStart) : data.leaseStart === null ? null : undefined;
  const leaseEnd   = data.leaseEnd   ? new Date(data.leaseEnd)   : data.leaseEnd   === null ? null : undefined;
  if (leaseStart && isNaN(leaseStart.getTime())) throw new AppError('Invalid lease start date', 400);
  if (leaseEnd   && isNaN(leaseEnd.getTime()))   throw new AppError('Invalid lease end date', 400);
  if (leaseStart && leaseEnd && leaseEnd <= leaseStart) {
    throw new AppError('Lease end must be after lease start', 400);
  }
  return prisma.allocation.update({
    where: { id: allocationId },
    data:  { ...(leaseStart !== undefined && { leaseStart }), ...(leaseEnd !== undefined && { leaseEnd }) },
    select: LEASE_SELECT,
  });
}

/** Admin: record the security deposit as paid and held. */
export async function recordDeposit(allocationId: string, data: { amount: number; note?: string }) {
  await loadLease(allocationId);
  if (!(data.amount > 0)) throw new AppError('Deposit amount must be greater than zero', 400);
  return prisma.allocation.update({
    where: { id: allocationId },
    data:  {
      depositAmount: data.amount,
      depositStatus: 'HELD',
      depositNote:   data.note?.trim() || null,
      depositRefunded: null,
    },
    select: LEASE_SELECT,
  });
}

/** Admin: refund the deposit (fully or partially) at move-out. */
export async function refundDeposit(allocationId: string, data: { amount: number; note?: string }) {
  const alloc = await loadLease(allocationId);
  if (alloc.depositStatus === 'NONE' || alloc.depositAmount == null) {
    throw new AppError('No deposit is on record for this lease', 400);
  }
  const held = Number(alloc.depositAmount);
  if (data.amount < 0)     throw new AppError('Refund amount cannot be negative', 400);
  if (data.amount > held)  throw new AppError(`Refund cannot exceed the deposit held (R${held})`, 400);

  const status = data.amount >= held ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
  const updated = await prisma.allocation.update({
    where: { id: allocationId },
    data:  {
      depositRefunded: data.amount,
      depositStatus:   status,
      depositNote:     data.note?.trim() || alloc.depositNote,
    },
    select: { ...LEASE_SELECT, userId: true },
  });
  void createNotification(updated.userId, {
    type:  'GENERAL',
    title: status === 'REFUNDED' ? 'Deposit refunded in full' : 'Deposit partially refunded',
    body:  `R${data.amount.toLocaleString()} of your R${held.toLocaleString()} deposit has been refunded.`,
    link:  '/profile',
  });
  return updated;
}

/** Tenant or admin: record that notice to vacate has been given. */
export async function giveNotice(allocationId: string) {
  const alloc = await loadLease(allocationId);
  if (alloc.noticeGivenAt) return alloc;          // idempotent
  if (alloc.status === 'ENDED') throw new AppError('This lease has already ended', 400);
  return prisma.allocation.update({
    where: { id: allocationId },
    data:  { noticeGivenAt: new Date() },
    select: LEASE_SELECT,
  });
}

/** Admin: schedule the move-out date. */
export async function scheduleMoveOut(allocationId: string, data: { moveOutDate: string }) {
  const alloc = await loadLease(allocationId);
  if (alloc.status === 'ENDED') throw new AppError('This lease has already ended', 400);
  const moveOutDate = new Date(data.moveOutDate);
  if (isNaN(moveOutDate.getTime())) throw new AppError('Invalid move-out date', 400);

  const updated = await prisma.allocation.update({
    where: { id: allocationId },
    data:  { moveOutDate },
    select: { ...LEASE_SELECT, userId: true },
  });
  void createNotification(updated.userId, {
    type:  'GENERAL',
    title: 'Move-out date scheduled',
    body:  `Your move-out is set for ${moveOutDate.toLocaleDateString()}.`,
    link:  '/profile',
  });
  return updated;
}

/** Admin: complete the move-out — ends the allocation and frees the room. */
export async function completeMoveOut(allocationId: string) {
  const alloc = await loadLease(allocationId);
  if (alloc.status === 'ENDED') throw new AppError('This lease has already ended', 400);

  const updated = await prisma.allocation.update({
    where: { id: allocationId },
    data:  { status: 'ENDED', moveOutCompletedAt: new Date() },
    select: { ...LEASE_SELECT, userId: true, roomId: true },
  });
  // Free up the room slot.
  await recomputeRoomStatus(updated.roomId);
  void createNotification(updated.userId, {
    type:  'GENERAL',
    title: 'Move-out completed',
    body:  'Your lease has ended. Thanks for staying with us.',
    link:  '/profile',
  });
  return updated;
}

/** Admin: renew the lease — extend the end date, optionally adjust rent. */
export async function renewLease(
  allocationId: string,
  data: { leaseEnd: string; rent?: number },
) {
  const alloc = await loadLease(allocationId);
  if (alloc.status === 'ENDED') throw new AppError('Cannot renew an ended lease', 400);
  const leaseEnd = new Date(data.leaseEnd);
  if (isNaN(leaseEnd.getTime())) throw new AppError('Invalid lease end date', 400);
  if (alloc.leaseEnd && leaseEnd <= alloc.leaseEnd) {
    throw new AppError('A renewal must extend the lease end date', 400);
  }
  if (data.rent !== undefined && data.rent <= 0) {
    throw new AppError('Rent must be greater than zero', 400);
  }

  const updated = await prisma.allocation.update({
    where: { id: allocationId },
    data:  {
      leaseEnd,
      ...(data.rent !== undefined && { rent: data.rent }),
      // A renewal clears any prior notice / scheduled move-out.
      noticeGivenAt: null,
      moveOutDate:   null,
    },
    select: { ...LEASE_SELECT, userId: true },
  });
  void createNotification(updated.userId, {
    type:  'CONTRACT',
    title: 'Lease renewed',
    body:  `Your lease now runs to ${leaseEnd.toLocaleDateString()}.`,
    link:  '/profile',
  });
  return updated;
}

// ── Inspections ────────────────────────────────────────────────

export async function listInspections(allocationId: string) {
  await loadLease(allocationId);
  return prisma.inspection.findMany({
    where:   { allocationId },
    orderBy: { inspectedAt: 'desc' },
  });
}

export async function createInspection(
  allocationId: string,
  inspectorId: string,
  data: { type: string; condition: string; notes?: string; photoUrls?: string[] },
) {
  await loadLease(allocationId);
  const TYPES: InspectionType[] = ['MOVE_IN', 'ROUTINE', 'MOVE_OUT'];
  if (!TYPES.includes(data.type as InspectionType)) {
    throw new AppError('Invalid inspection type', 400);
  }
  if (!data.condition?.trim()) throw new AppError('Condition is required', 400);

  // Photos arrive as base64 data URLs — persist each to disk.
  const photoUrls = (data.photoUrls ?? [])
    .map(p => persistIfDataUrl(p, 'inspection'))
    .filter((p): p is string => typeof p === 'string' && p.length > 0);

  return prisma.inspection.create({
    data: {
      allocationId,
      type:      data.type as InspectionType,
      condition: data.condition.trim(),
      notes:     data.notes?.trim() || null,
      photoUrls,
      inspectorId,
    },
  });
}
