import prisma from '../config/database';
import { AppError } from '../middleware/error.middleware';

export async function listResidences() {
  const list = await prisma.residence.findMany({
    where:   { archived: false },
    include: { _count: { select: { rooms: true, contractors: true } } },
    orderBy: { createdAt: 'asc' },
  });

  // Decorate each residence with quick health metrics
  const decorated = await Promise.all(list.map(async (r) => {
    const rooms = await prisma.room.findMany({
      where: { residenceId: r.id },
      include: { allocations: { where: { status: { in: ['ACTIVE', 'RESERVED'] } } } },
    });
    const totalSlots  = rooms.reduce((s, rm) => s + (rm.capacity || 1), 0);
    const filledSlots = rooms.reduce((s, rm) => s + rm.allocations.length, 0);
    const projected   = rooms.reduce((s, rm) => {
      const active = rm.allocations.filter(a => a.status === 'ACTIVE').length;
      return s + active * Number(rm.price ?? 0);
    }, 0);
    return {
      id: r.id, name: r.name, tagline: r.tagline, address: r.address,
      phone: r.phone, email: r.email, description: r.description,
      createdAt: r.createdAt,
      roomCount:        r._count.rooms,
      contractorCount:  r._count.contractors,
      totalSlots, filledSlots,
      occupancyPct: totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0,
      projectedMonthly: projected,
    };
  }));
  return decorated;
}

export async function createResidence(data: {
  name: string; tagline?: string; address?: string;
  phone?: string; email?: string; description?: string;
}) {
  if (!data.name?.trim()) throw new AppError('Residence name is required', 400);
  return prisma.residence.create({
    data: {
      name:        data.name.trim(),
      tagline:     data.tagline?.trim() || null,
      address:     data.address?.trim() || null,
      phone:       data.phone?.trim() || null,
      email:       data.email?.trim() || null,
      description: data.description?.trim() || null,
    },
  });
}

export async function updateResidence(id: string, data: Partial<{
  name: string; tagline: string; address: string;
  phone: string; email: string; description: string;
}>) {
  const existing = await prisma.residence.findUnique({ where: { id } });
  if (!existing) throw new AppError('Residence not found', 404);
  return prisma.residence.update({
    where: { id },
    data: {
      ...(data.name        !== undefined && { name:        data.name.trim() }),
      ...(data.tagline     !== undefined && { tagline:     data.tagline?.trim() || null }),
      ...(data.address     !== undefined && { address:     data.address?.trim() || null }),
      ...(data.phone       !== undefined && { phone:       data.phone?.trim() || null }),
      ...(data.email       !== undefined && { email:       data.email?.trim() || null }),
      ...(data.description !== undefined && { description: data.description?.trim() || null }),
    },
  });
}

export async function archiveResidence(id: string) {
  const existing = await prisma.residence.findUnique({
    where: { id },
    include: { _count: { select: { rooms: true } } },
  });
  if (!existing) throw new AppError('Residence not found', 404);
  if (existing._count.rooms > 0) {
    throw new AppError(`Can't archive — ${existing._count.rooms} rooms still attached`, 400);
  }
  return prisma.residence.update({ where: { id }, data: { archived: true } });
}
