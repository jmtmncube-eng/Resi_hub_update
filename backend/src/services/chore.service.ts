import prisma from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { earnCredits } from './wallet.service';
import { sendEmail } from './email.service';

const COMPLETE_REWARD = 20;
const APPROVAL_WINDOW_HOURS = 24;

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

/**
 * Submit completion + photo proof. Does NOT award the +20 credits — waits for admin approval.
 * Sets a 24-hour approval window.
 */
export async function completeChore(choreId: string, userId: string, proofUrl: string, note?: string) {
  if (!proofUrl || !proofUrl.trim()) {
    throw new AppError('Photo proof is required to mark a chore done', 400);
  }
  const chore = await prisma.chore.findUnique({ where: { id: choreId } });
  if (!chore) throw new AppError('Chore not found', 404);
  if (chore.claimedById && chore.claimedById !== userId) {
    throw new AppError('Only the student who claimed this chore can submit proof', 403);
  }
  if (chore.proofStatus === 'PENDING') {
    throw new AppError('Proof already submitted — awaiting admin review', 409);
  }
  if (chore.doneById && chore.proofStatus === 'APPROVED') {
    throw new AppError('Chore already completed and approved', 409);
  }

  const deadline = new Date(Date.now() + APPROVAL_WINDOW_HOURS * 3600_000);
  const [updated] = await Promise.all([
    prisma.chore.update({
      where: { id: choreId },
      data:  {
        doneById:         userId,
        doneAt:           new Date(),
        proofUrl:         proofUrl.trim(),
        proofStatus:      'PENDING',
        proofSubmittedAt: new Date(),
        approvalDeadline: deadline,
        approvedAt:       null,
        approvedById:     null,
        adminNote:        null,
      },
    }),
    prisma.choreLog.create({
      data: { choreId, userId, action: 'COMPLETED', note: note ?? 'Proof submitted; awaiting admin review' },
    }),
  ]);
  return updated;
}

/* ── Admin endpoints ──────────────────────────────────────────── */

export async function getPendingApprovals() {
  return prisma.chore.findMany({
    where: { proofStatus: 'PENDING' },
    include: {
      logs: {
        where: { action: 'COMPLETED' },
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
      },
    },
    orderBy: { proofSubmittedAt: 'asc' },
  });
}

export async function approveChoreProof(choreId: string, adminId: string) {
  const chore = await prisma.chore.findUnique({ where: { id: choreId } });
  if (!chore) throw new AppError('Chore not found', 404);
  if (chore.proofStatus !== 'PENDING') {
    throw new AppError('No pending proof to approve', 400);
  }
  const studentId = chore.doneById!;

  await prisma.$transaction([
    prisma.chore.update({
      where: { id: choreId },
      data:  {
        proofStatus:  'APPROVED',
        approvedAt:   new Date(),
        approvedById: adminId,
        // Reset claim slot so chore is ready for next cycle
        claimedById:  null,
      },
    }),
  ]);
  // Award credits OUTSIDE the same tx so wallet helpers stay decoupled
  await earnCredits(studentId, COMPLETE_REWARD, `Chore approved: ${chore.name}`);

  // Best-effort email
  const student = await prisma.user.findUnique({ where: { id: studentId } });
  if (student) {
    sendEmail({
      to: student.email,
      template: 'choreApproved',
      data: { name: student.name, choreName: chore.name, credits: COMPLETE_REWARD },
    }).catch(() => { /* logged inside */ });
  }

  return prisma.chore.findUnique({ where: { id: choreId } });
}

export async function rejectChoreProof(choreId: string, adminId: string, adminNote?: string) {
  const chore = await prisma.chore.findUnique({ where: { id: choreId } });
  if (!chore) throw new AppError('Chore not found', 404);
  if (chore.proofStatus !== 'PENDING') {
    throw new AppError('No pending proof to reject', 400);
  }
  const studentId = chore.doneById!;

  const [updated] = await Promise.all([
    prisma.chore.update({
      where: { id: choreId },
      data:  {
        proofStatus:  'REJECTED',
        approvedAt:   new Date(),
        approvedById: adminId,
        adminNote:    adminNote ?? null,
        // Clear done state so the student (still claimed) can resubmit
        doneById:     null,
        doneAt:       null,
      },
    }),
    prisma.choreLog.create({
      data: { choreId, userId: studentId, action: 'UNCLAIMED', note: `Proof rejected${adminNote ? ': ' + adminNote : ''}` },
    }),
  ]);

  // Best-effort email
  const student = await prisma.user.findUnique({ where: { id: studentId } });
  if (student) {
    sendEmail({
      to: student.email,
      template: 'choreRejected',
      data: { name: student.name, choreName: chore.name, reason: adminNote ?? '' },
    }).catch(() => { /* logged inside */ });
  }

  return updated;
}
