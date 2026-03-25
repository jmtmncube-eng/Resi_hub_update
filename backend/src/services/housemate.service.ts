import prisma from '../config/database';
import { AppError } from '../middleware/error.middleware';

export async function getHousemates(userId: string) {
  // Find the user's block
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { allocation: { include: { room: true } } },
  });

  if (!user?.allocation) throw new AppError('You must have an active allocation to view housemates', 400);

  const block = user.allocation.room.block;

  // All active students in the same block, excluding self
  const allocations = await prisma.allocation.findMany({
    where: {
      status: 'ACTIVE',
      room:   { block },
      userId: { not: userId },
    },
    include: {
      user: {
        select: {
          id:         true,
          name:       true,
          avatarUrl:  true,
          university: true,
          program:    true,
          year:       true,
          bio:        true,
        },
      },
      room: {
        select: { number: true, block: true, type: true },
      },
    },
  });

  return {
    block,
    housemates: allocations.map(a => ({
      ...a.user,
      room: a.room,
    })),
  };
}
