import prisma from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { earnCredits } from './wallet.service';

export async function getChores(block: string) {
  return prisma.chore.findMany({
    where: { block },
    include: {
      logs: {
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { user: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
}

export async function claimChore(choreId: string, userId: string) {
  const chore = await prisma.chore.findUnique({ where: { id: choreId } });
  if (!chore) throw new AppError('Chore not found', 404);
  if (chore.claimedById) throw new AppError('This chore is already claimed', 409);
  if (chore.doneById)    throw new AppError('This chore has already been completed', 409);

  const [updated] = await Promise.all([
    prisma.chore.update({
      where: { id: choreId },
      data:  { claimedById: userId },
    }),
    prisma.choreLog.create({
      data: { choreId, userId, action: 'CLAIMED' },
    }),
    earnCredits(userId, 5, `Claimed: ${chore.name}`),
  ]);
  return updated;
}

export async function unclaimChore(choreId: string, userId: string) {
  const chore = await prisma.chore.findUnique({ where: { id: choreId } });
  if (!chore) throw new AppError('Chore not found', 404);
  if (chore.claimedById !== userId) throw new AppError('You have not claimed this chore', 403);

  const [updated] = await Promise.all([
    prisma.chore.update({
      where: { id: choreId },
      data:  { claimedById: null },
    }),
    prisma.choreLog.create({
      data: { choreId, userId, action: 'UNCLAIMED' },
    }),
    earnCredits(userId, -5, `Unclaimed: ${chore.name}`),
  ]);
  return updated;
}

export async function completeChore(choreId: string, userId: string, note?: string) {
  const chore = await prisma.chore.findUnique({ where: { id: choreId } });
  if (!chore) throw new AppError('Chore not found', 404);
  if (chore.doneById) throw new AppError('Chore already completed', 409);

  const [updated] = await Promise.all([
    prisma.chore.update({
      where: { id: choreId },
      data:  { doneById: userId, doneAt: new Date(), claimedById: null },
    }),
    prisma.choreLog.create({
      data: { choreId, userId, action: 'COMPLETED', note },
    }),
    earnCredits(userId, 20, `Completed: ${chore.name}`),
  ]);
  return updated;
}
