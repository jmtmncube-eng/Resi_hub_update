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
  // Capture the student's residence at ticket-creation time so admin
  // filters work even if the student later moves rooms.
  const alloc = await prisma.allocation.findUnique({
    where:  { userId },
    select: { room: { select: { residenceId: true } } },
  });
  return prisma.maintenanceTicket.create({
    data: {
      studentId:   userId,
      residenceId: alloc?.room?.residenceId ?? null,
      category:    data.category,
      location:    data.location,
      description: data.description,
      priority:    data.priority ?? 'NORMAL',
      mediaUrls,
    },
  });
}

export async function updateTicket(id: string, data: UpdateTicketInput) {
  const ticket = await prisma.maintenanceTicket.findUnique({
    where: { id },
    include: { student: { select: { id: true, name: true, email: true } } },
  });
  if (!ticket) throw new AppError('Ticket not found', 404);

  const updated = await prisma.maintenanceTicket.update({
    where: { id },
    data: {
      ...(data.status    && { status:    data.status }),
      ...(data.adminNote !== undefined && { adminNote: data.adminNote }),
      ...(data.priority  && { priority:  data.priority }),
    },
  });

  // Email the student when status actually changes — keeps inbox quiet
  // for note-only tweaks that they don't need to know about.
  if (data.status && data.status !== ticket.status) {
    const { sendEmail } = await import('./email.service');
    sendEmail({
      to: ticket.student.email,
      template: 'maintenanceTriaged',
      data: {
        studentName: ticket.student.name,
        ticketTitle: `${ticket.category} · ${ticket.location}`,
        status: data.status,
        adminNote: data.adminNote ?? undefined,
      },
    }).catch(() => { /* logged inside */ });
  }

  return updated;
}

// Admin: all tickets, optionally scoped to a single residence
export async function getAllTickets(filters: {
  status?:      string;
  priority?:    string;
  search?:      string;
  residenceId?: string;
}) {
  return prisma.maintenanceTicket.findMany({
    where: {
      ...(filters.status      && { status:      filters.status   as never }),
      ...(filters.priority    && { priority:    filters.priority as never }),
      ...(filters.residenceId && { residenceId: filters.residenceId }),
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
