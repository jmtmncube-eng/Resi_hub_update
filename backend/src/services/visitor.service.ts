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

  const room    = user.allocation.room;
  const dateStr = data.date.replace(/-/g, '');
  const qrCode  = `QR-${room.number}-${dateStr}-${randomUUID().slice(0, 6).toUpperCase()}`;

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
