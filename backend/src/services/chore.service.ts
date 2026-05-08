import prisma from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { earnCredits } from './wallet.service';
import { sendEmail } from './email.service';

const APPROVAL_WINDOW_HOURS = 24;

/** Student-facing chore list. Filters by residence + (optionally) block,
 *  resolving the student's residence from their allocation when not given. */
export async function getChores(userId: string, block?: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { allocation: { include: { room: { select: { residenceId: true, block: true } } } } },
  });
  const residenceId = user?.allocation?.room?.residenceId ?? null;
  const studentBlock = block ?? user?.allocation?.room?.block;

  return prisma.chore.findMany({
    // Students only see ACTIVE chores in their residence (or portfolio-wide
    // chores with residenceId null). Block filter is optional — when omitted
    // they see every active chore in their residence.
    where: {
      active: true,
      ...(studentBlock ? { block: studentBlock } : {}),
      ...(residenceId
        ? { OR: [{ residenceId }, { residenceId: null }] }
        : {}),
    },
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

/* ── Admin: full chore CRUD ───────────────────────────────────── */

/** List ALL chores (any block, any status) for admin management.
 *  Optionally scoped by residence. Resolves claimedBy/doneBy names manually
 *  since those FKs aren't formal Prisma relations. */
export async function listAllChores(residenceId?: string) {
  const chores = await prisma.chore.findMany({
    where: residenceId ? { residenceId } : undefined,
    include: {
      logs: {
        orderBy: { createdAt: 'desc' },
        take: 3,
        include: { user: { select: { name: true } } },
      },
    },
    orderBy: [{ active: 'desc' }, { block: 'asc' }, { createdAt: 'desc' }],
  });

  // Pull claimer + completer names in one query (avoid N+1)
  const ids = Array.from(new Set([
    ...chores.map(c => c.claimedById).filter((x): x is string => !!x),
    ...chores.map(c => c.doneById).filter((x): x is string => !!x),
  ]));
  const users = ids.length === 0 ? [] : await prisma.user.findMany({
    where:  { id: { in: ids } },
    select: { id: true, name: true },
  });
  const nameById = new Map(users.map(u => [u.id, u.name]));

  return chores.map(c => ({
    ...c,
    claimedByName: c.claimedById ? nameById.get(c.claimedById) ?? null : null,
    doneByName:    c.doneById    ? nameById.get(c.doneById)    ?? null : null,
  }));
}

export async function createChore(data: {
  icon?: string; name: string; description?: string;
  frequency?: string; block: string;
  residenceId?: string;
  creditReward?: number;
}) {
  if (!data.name?.trim())  throw new AppError('Name is required', 400);
  if (!data.block?.trim()) throw new AppError('Block is required', 400);
  const reward = data.creditReward ?? 20;
  if (reward < 0 || reward > 1000) throw new AppError('Credit reward must be between 0 and 1000', 400);

  return prisma.chore.create({
    data: {
      icon:         data.icon?.trim()        || '🧹',
      name:         data.name.trim(),
      description:  data.description?.trim() || '',
      frequency:    data.frequency?.trim()   || 'Weekly',
      block:        data.block.trim().toUpperCase(),
      residenceId:  data.residenceId ?? null,
      creditReward: reward,
      active:       true,
    },
  });
}

export async function updateChore(id: string, data: Partial<{
  icon: string; name: string; description: string;
  frequency: string; block: string; active: boolean;
  creditReward: number;
}>) {
  const existing = await prisma.chore.findUnique({ where: { id } });
  if (!existing) throw new AppError('Chore not found', 404);
  if (data.creditReward !== undefined && (data.creditReward < 0 || data.creditReward > 1000)) {
    throw new AppError('Credit reward must be between 0 and 1000', 400);
  }
  return prisma.chore.update({
    where: { id },
    data: {
      ...(data.icon         !== undefined && { icon: data.icon.trim() || '🧹' }),
      ...(data.name         !== undefined && { name: data.name.trim() }),
      ...(data.description  !== undefined && { description: data.description.trim() }),
      ...(data.frequency    !== undefined && { frequency: data.frequency.trim() }),
      ...(data.block        !== undefined && { block: data.block.trim().toUpperCase() }),
      ...(data.active       !== undefined && { active: data.active }),
      ...(data.creditReward !== undefined && { creditReward: data.creditReward }),
    },
  });
}

/** Hard-delete a chore + its logs. Refuses if there's a pending proof
 *  (admin should approve/reject first to keep the audit trail). */
export async function deleteChore(id: string) {
  const chore = await prisma.chore.findUnique({ where: { id } });
  if (!chore) throw new AppError('Chore not found', 404);
  if (chore.proofStatus === 'PENDING') {
    throw new AppError('A pending proof exists — approve or reject it first.', 409);
  }
  await prisma.chore.delete({ where: { id } });
  return { id, name: chore.name };
}

/* ── Admin: proof approvals ──────────────────────────────────── */

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
  // Award credits OUTSIDE the same tx so wallet helpers stay decoupled.
  // Reward amount is per-chore — admin sets it on create/edit (default 20).
  const reward = chore.creditReward ?? 20;
  await earnCredits(studentId, reward, `Chore approved: ${chore.name}`);

  // Best-effort email
  const student = await prisma.user.findUnique({ where: { id: studentId } });
  if (student) {
    sendEmail({
      to: student.email,
      template: 'choreApproved',
      data: { name: student.name, choreName: chore.name, credits: reward },
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
