import prisma from '../config/database';
import { AppError } from '../middleware/error.middleware';

export async function getWallet(userId: string) {
  const wallet = await prisma.wallet.findUnique({
    where: { userId },
    include: {
      transactions: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  });
  if (!wallet) throw new AppError('Wallet not found', 404);
  return wallet;
}

export async function getVouchers(userId: string) {
  const vouchers = await prisma.voucher.findMany({
    where:   { isActive: true },
    orderBy: { cost: 'asc' },
    include: {
      claims: { where: { userId }, select: { id: true, status: true, proofUrl: true, createdAt: true } },
    },
  });
  // Hide pin/imageUrl from task-vouchers unless the user's claim is APPROVED
  return vouchers.map(v => {
    const myClaim = v.claims[0] ?? null;
    const revealed = myClaim?.status === 'APPROVED';
    return {
      ...v,
      pin:      revealed ? v.pin      : null,
      imageUrl: revealed ? v.imageUrl : null,
      myClaim,
    };
  });
}

/** Student submits task proof for a task-based voucher */
export async function submitTaskProof(userId: string, voucherId: string, proofUrl: string) {
  const voucher = await prisma.voucher.findUnique({ where: { id: voucherId } });
  if (!voucher)            throw new AppError('Voucher not found', 404);
  if (!voucher.requiresProof) throw new AppError('This voucher does not require task proof', 400);

  const existing = await prisma.voucherClaim.findUnique({
    where: { voucherId_userId: { voucherId, userId } },
  });
  if (existing && existing.status !== 'REJECTED') {
    throw new AppError('You have already submitted a claim for this voucher', 409);
  }

  if (existing && existing.status === 'REJECTED') {
    // Re-submit
    return prisma.voucherClaim.update({
      where: { id: existing.id },
      data:  { proofUrl, status: 'PENDING', approvedBy: null, approvedAt: null, adminNote: null },
    });
  }

  return prisma.voucherClaim.create({
    data: { voucherId, userId, proofUrl, status: 'PENDING' },
  });
}

export async function earnCredits(userId: string, amount: number, note: string) {
  let wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) {
    wallet = await prisma.wallet.create({ data: { userId, credits: 0 } });
  }
  await Promise.all([
    prisma.wallet.update({
      where: { userId },
      data:  { credits: { increment: amount } },
    }),
    prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type:     amount >= 0 ? 'EARN' : 'ADJUST',
        amount,
        note,
      },
    }),
  ]);
}

export async function redeemVoucher(userId: string, voucherId: string) {
  const [wallet, voucher] = await Promise.all([
    prisma.wallet.findUnique({ where: { userId } }),
    prisma.voucher.findUnique({ where: { id: voucherId } }),
  ]);

  if (!wallet)  throw new AppError('Wallet not found', 404);
  if (!voucher) throw new AppError('Voucher not found', 404);
  if (!voucher.isActive)  throw new AppError('Voucher is no longer available', 400);
  if (voucher.stock < 1)  throw new AppError('This voucher is out of stock', 400);
  if (voucher.requiresProof) {
    throw new AppError(
      'This voucher requires task completion — go to the Tasks tab, complete the task, and upload proof.',
      400,
    );
  }
  if (wallet.credits < voucher.cost) {
    throw new AppError(`Not enough credits — you need ${voucher.cost} 🪙 but have ${wallet.credits}`, 400);
  }

  const txn = await prisma.$transaction(async (tx) => {
    await tx.wallet.update({
      where: { id: wallet.id },
      data:  { credits: { decrement: voucher.cost } },
    });
    await tx.voucher.update({
      where: { id: voucherId },
      data:  { stock: { decrement: 1 } },
    });
    const transaction = await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type:     'REDEEM',
        amount:   -voucher.cost,
        note:     `Redeemed: ${voucher.name}`,
      },
    });
    await tx.voucherRedemption.create({
      data: {
        walletId:      wallet.id,
        voucherId,
        transactionId: transaction.id,
      },
    });
    return transaction;
  });

  return { txn, voucher };
}

// Leaderboard — top students by credits
export async function getLeaderboard() {
  return prisma.wallet.findMany({
    orderBy: { credits: 'desc' },
    take: 10,
    include: {
      user: {
        select: { id: true, name: true, avatarUrl: true },
      },
    },
  });
}
