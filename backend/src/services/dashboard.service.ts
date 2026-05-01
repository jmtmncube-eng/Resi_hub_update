import prisma from '../config/database';
import { AppError } from '../middleware/error.middleware';

export async function getDashboard(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      allocation: { include: { room: true } },
      wallet: true,
      maintenanceTickets: {
        where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
        orderBy: { createdAt: 'desc' },
        take: 3,
      },
      visitorPasses: {
        where: { status: { in: ['UPCOMING', 'ACTIVE'] } },
        orderBy: { date: 'asc' },
        take: 3,
      },
    },
  });

  if (!user) throw new AppError('User not found', 404);

  // Pinned news (with per-user read flag)
  const pinnedRaw = await prisma.news.findMany({
    where: { pinned: true },
    orderBy: { createdAt: 'desc' },
    take: 3,
    include: {
      author: { select: { name: true } },
      reads:  { where: { userId }, select: { id: true } },
    },
  });
  const pinnedNews = pinnedRaw.map(item => {
    const { reads, ...rest } = item as any;
    return { ...rest, read: !!(reads && reads.length > 0) };
  });

  // Active chores for the user's block
  const block = user.allocation?.room?.block ?? 'Block A';
  const activeChores = await prisma.chore.findMany({
    where: { block, doneById: null },
    orderBy: { createdAt: 'asc' },
    take: 4,
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl,
    },
    allocation: user.allocation,
    wallet: user.wallet,
    openTickets: user.maintenanceTickets,
    upcomingVisitors: user.visitorPasses,
    pinnedNews,
    activeChores,
  };
}
