import { randomUUID } from 'crypto';
import prisma from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { CreateVisitorInput } from '../validators/visitor.validator';

export async function getMyPasses(userId: string) {
  return prisma.visitorPass.findMany({
    where: { hostId: userId },
    orderBy: { date: 'desc' },
  });
}

export async function createPass(userId: string, data: CreateVisitorInput) {
  // Get host's room info for QR
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { allocation: { include: { room: true } } },
  });
  if (!user?.allocation) throw new AppError('You must have an active room to invite visitors', 400);

  const room = user.allocation.room;
  // Short, human-readable code: <room>-<5 char nonce>, e.g. "A101-K7M2X"
  // Easy to type / read out over the phone if needed, ~10 chars total.
  const nonce = randomUUID().replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 5);
  const qrCode = `${room.number}-${nonce}`;

  return prisma.visitorPass.create({
    data: {
      hostId:       userId,
      visitorName:  data.visitorName,
      visitorPhone: data.visitorPhone,
      date:         new Date(data.date),
      timeFrom:     data.timeFrom,
      timeTo:       data.timeTo,
      purpose:      data.purpose,
      status:       'UPCOMING',
      qrCode,
    },
  });
}

export async function cancelPass(id: string, userId: string) {
  const pass = await prisma.visitorPass.findUnique({ where: { id } });
  if (!pass) throw new AppError('Visitor pass not found', 404);
  if (pass.hostId !== userId) throw new AppError('Not authorised', 403);
  if (pass.checkedIn) throw new AppError('Cannot cancel a pass that has already checked in', 400);
  return prisma.visitorPass.update({ where: { id }, data: { status: 'CANCELLED' } });
}

// Admin: all passes
export async function getAllPasses() {
  return prisma.visitorPass.findMany({
    include: { host: { select: { id: true, name: true, avatarUrl: true } } },
    orderBy: { date: 'desc' },
  });
}

// Admin: check in a visitor
export async function checkIn(id: string) {
  const pass = await prisma.visitorPass.findUnique({ where: { id } });
  if (!pass) throw new AppError('Visitor pass not found', 404);
  return prisma.visitorPass.update({
    where: { id },
    data: { checkedIn: true, checkedInAt: new Date(), status: 'ACTIVE' },
  });
}

/**
 * Public gate scan — no auth. The QR code itself is the credential.
 * Toggles the pass status:
 *   UPCOMING (or any pre-arrival)  → ACTIVE + checkedIn        (entry)
 *   ACTIVE                         → EXPIRED                   (exit)
 *   EXPIRED / CANCELLED            → reject with clear message
 *
 * Returns enough information for the gate UI to show a green/rose card
 * with the visitor name, host name + room, and the new state.
 */
export async function gateScan(qrCode: string) {
  const code = qrCode.trim();
  if (!code) throw new AppError('QR code is required', 400);

  const pass = await prisma.visitorPass.findUnique({
    where:   { qrCode: code },
    include: {
      host: {
        select: {
          id: true, name: true, email: true,
          allocation: { select: { room: { select: { number: true, block: true } } } },
        },
      },
    },
  });
  if (!pass) throw new AppError('Unknown QR code — pass not found', 404);

  // Reject terminal states
  if (pass.status === 'CANCELLED') throw new AppError('This pass was cancelled by the host', 410);
  if (pass.status === 'EXPIRED')   throw new AppError('This visitor has already checked out', 410);

  let action: 'ENTRY' | 'EXIT';
  let updated;
  if (pass.status === 'ACTIVE' && pass.checkedIn) {
    // Already inside → exit
    action  = 'EXIT';
    updated = await prisma.visitorPass.update({
      where: { id: pass.id },
      data:  { status: 'EXPIRED' },
    });
  } else {
    // Not yet inside → entry
    action  = 'ENTRY';
    updated = await prisma.visitorPass.update({
      where: { id: pass.id },
      data:  { status: 'ACTIVE', checkedIn: true, checkedInAt: new Date() },
    });
  }

  return {
    action,
    pass: {
      id:           pass.id,
      visitorName:  pass.visitorName,
      visitorPhone: pass.visitorPhone,
      purpose:      pass.purpose,
      date:         pass.date,
      timeFrom:     pass.timeFrom,
      timeTo:       pass.timeTo,
      qrCode:       pass.qrCode,
      status:       updated.status,
      checkedInAt:  updated.checkedInAt,
    },
    host: {
      id:    pass.host.id,
      name:  pass.host.name,
      email: pass.host.email,
      room:  pass.host.allocation?.room
        ? { number: pass.host.allocation.room.number, block: pass.host.allocation.room.block }
        : null,
    },
  };
}

/** Admin: hard-delete any visitor pass. Use for spam, mistakes, or test
 *  records — gate-log history is preserved via the AuditLog system. */
export async function adminDeletePass(id: string) {
  const pass = await prisma.visitorPass.findUnique({ where: { id } });
  if (!pass) throw new AppError('Visitor pass not found', 404);
  await prisma.visitorPass.delete({ where: { id } });
  return { id };
}

/** Admin: force-check-out a visitor when the student forgot to do it.
 *  Sets the pass to EXPIRED so it appears resolved on the dashboard. */
export async function checkOut(id: string) {
  const pass = await prisma.visitorPass.findUnique({ where: { id } });
  if (!pass) throw new AppError('Visitor pass not found', 404);
  if (!pass.checkedIn) throw new AppError('Visitor never checked in', 400);
  if (pass.status === 'EXPIRED') return pass;
  return prisma.visitorPass.update({
    where: { id },
    data:  { status: 'EXPIRED' },
  });
}
