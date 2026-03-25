import prisma from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { CreateTicketInput, UpdateTicketInput } from '../validators/maintenance.validator';

export async function getMyTickets(userId: string) {
  return prisma.maintenanceTicket.findMany({
    where: { studentId: userId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getTicketById(id: string, userId: string, role: string) {
  const ticket = await prisma.maintenanceTicket.findUnique({ where: { id } });
  if (!ticket) throw new AppError('Ticket not found', 404);
  if (role !== 'ADMIN' && ticket.studentId !== userId) {
    throw new AppError('Not authorised to view this ticket', 403);
  }
  return ticket;
}

export async function createTicket(userId: string, data: CreateTicketInput, mediaUrls: string[] = []) {
  return prisma.maintenanceTicket.create({
    data: {
      studentId:   userId,
      category:    data.category,
      location:    data.location,
      description: data.description,
      priority:    data.priority ?? 'NORMAL',
      mediaUrls,
    },
  });
}

export async function updateTicket(id: string, data: UpdateTicketInput) {
  const ticket = await prisma.maintenanceTicket.findUnique({ where: { id } });
  if (!ticket) throw new AppError('Ticket not found', 404);
  return prisma.maintenanceTicket.update({
    where: { id },
    data: {
      ...(data.status    && { status:    data.status }),
      ...(data.adminNote !== undefined && { adminNote: data.adminNote }),
      ...(data.priority  && { priority:  data.priority }),
    },
  });
}

// Admin: all tickets
export async function getAllTickets(filters: {
  status?:   string;
  priority?: string;
  search?:   string;
}) {
  return prisma.maintenanceTicket.findMany({
    where: {
      ...(filters.status   && { status:   filters.status   as never }),
      ...(filters.priority && { priority: filters.priority as never }),
      ...(filters.search   && {
        OR: [
          { category:    { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
          { location:    { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
    },
    include: { student: { select: { id: true, name: true, avatarUrl: true } } },
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
  });
}
