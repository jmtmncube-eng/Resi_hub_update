import prisma from '../config/database';

// ── Application Status ─────────────────────────────────────────
// Returns the pending student's allocation with room details (or null)
export async function getApplicationStatus(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id:         true,
      name:       true,
      email:      true,
      role:       true,
      university: true,
      program:    true,
      year:       true,
      createdAt:  true,
      allocation: {
        select: {
          id:        true,
          status:    true,
          moveIn:    true,
          rent:      true,
          createdAt: true,
          room: {
            select: {
              id:     true,
              number: true,
              block:  true,
              type:   true,
              price:  true,
            },
          },
        },
      },
    },
  });

  if (!user) return null;

  return user;
}

// ── Browse Rooms ───────────────────────────────────────────────
// Returns all VACANT rooms a pending student can browse
export async function getAvailableRooms() {
  const rooms = await prisma.room.findMany({
    where: { status: 'VACANT' },
    orderBy: [{ block: 'asc' }, { number: 'asc' }],
    select: {
      id:     true,
      number: true,
      block:  true,
      type:   true,
      price:  true,
      status: true,
    },
  });

  return rooms;
}
