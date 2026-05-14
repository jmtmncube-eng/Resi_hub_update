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

export async function getVouchers(_userId: string) {
  // Vouchers are credit-redeemable rewards. (The old "task voucher" variant
  // — do a task, upload proof, admin approves — was retired: chores already
  // own the do-task-earn-reward loop, so two parallel systems was confusing.)
  return prisma.voucher.findMany({
    where:   { isActive: true },
    orderBy: { cost: 'asc' },
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
