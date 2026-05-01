import prisma from '../config/database';
import { AppError } from '../middleware/error.middleware';

const TYPE_CAPACITY: Record<string, number> = {
  SINGLE: 1, DOUBLE: 2, TRIPLE: 3, QUAD: 4, STUDIO: 1,
};

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
// Returns rooms with capacity info so students see "X/Y filled" and pick
// any room that still has at least one open slot (not just fully VACANT ones).
export async function getAvailableRooms() {
  const rooms = await prisma.room.findMany({
    where: { status: { in: ['VACANT', 'RESERVED'] } },
    orderBy: [{ block: 'asc' }, { number: 'asc' }],
    include: {
      allocations: {
        where: { status: { in: ['ACTIVE', 'RESERVED'] } },
        select: { id: true },
      },
    },
  });

  return rooms.map(r => {
    const capacity   = r.capacity || TYPE_CAPACITY[r.type] || 1;
    const occupied   = r.allocations.length;
    return {
      id:        r.id,
      number:    r.number,
      block:     r.block,
      type:      r.type,
      price:     r.price,
      status:    r.status,
      capacity,
      occupied,
      vacantSlots: capacity - occupied,
    };
  }).filter(r => r.vacantSlots > 0);
}

/**
 * Pending student self-selects a room. Creates a RESERVED allocation —
 * admin then activates it once they actually move in.
 */
export async function selectRoom(userId: string, roomId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { allocation: true },
  });
  if (!user) throw new AppError('User not found', 404);
  if (user.allocation) {
    throw new AppError('You already have a room — contact management to change it', 409);
  }

  const room = await prisma.room.findUnique({
    where:   { id: roomId },
    include: { allocations: { where: { status: { in: ['ACTIVE', 'RESERVED'] } } } },
  });
  if (!room) throw new AppError('Room not found', 404);

  const capacity = room.capacity || TYPE_CAPACITY[room.type] || 1;
  if (room.allocations.length >= capacity) {
    throw new AppError('Sorry, that room just filled up — pick another', 409);
  }

  const allocation = await prisma.allocation.create({
    data: {
      userId,
      roomId,
      rent:   room.price,
      status: 'RESERVED',
    },
    include: {
      room: { select: { id: true, number: true, block: true, type: true } },
    },
  });

  // Recompute room status (VACANT → RESERVED, or stay RESERVED)
  const stillHasSlot = (room.allocations.length + 1) < capacity;
  await prisma.room.update({
    where: { id: roomId },
    data:  { status: stillHasSlot ? 'RESERVED' : 'OCCUPIED' },
  });

  return allocation;
}
