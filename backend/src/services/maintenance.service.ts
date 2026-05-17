import prisma from '../config/database';
import { Prisma } from '@prisma/client';
import { AppError } from '../middleware/error.middleware';
import { CreateTicketInput, UpdateTicketInput } from '../validators/maintenance.validator';

/** Include shape used everywhere we return a ticket — pulls the audit
 *  trail in newest-first order so the frontend can show the latest
 *  update without re-sorting. Also bundles the student identity so the
 *  detail view can render "From: Sarah <sarah@campus.edu>" headers in
 *  the conversation thread without an extra round-trip. */
const TICKET_INCLUDE = {
  updates: { orderBy: { createdAt: 'desc' as const } },
  student: { select: { id: true, name: true, email: true, avatarUrl: true } },
};

export async function getMyTickets(userId: string) {
  return prisma.maintenanceTicket.findMany({
    where:   { studentId: userId },
    include: TICKET_INCLUDE,
    orderBy: { createdAt: 'desc' },
  });
}

export async function getTicketById(id: string, userId: string, role: string) {
  const ticket = await prisma.maintenanceTicket.findUnique({ where: { id }, include: TICKET_INCLUDE });
  if (!ticket) throw new AppError('Ticket not found', 404);
  // Any ops-staff role (admin / manager / maintenance) can view any ticket;
  // students can only see their own. Mirrors the route-level guard.
  const isStaff = role === 'ADMIN' || role === 'MANAGER' || role === 'MAINTENANCE';
  if (!isStaff && ticket.studentId !== userId) {
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

export async function updateTicket(
  id: string,
  data: UpdateTicketInput,
  actorId?: string,
) {
  // Resolve the actor's name so the audit row remains readable even if
  // the actor is later renamed or deactivated.
  const actor = actorId
    ? await prisma.user.findUnique({ where: { id: actorId }, select: { id: true, name: true } })
    : null;
  const ticket = await prisma.maintenanceTicket.findUnique({
    where: { id },
    include: { student: { select: { id: true, name: true, email: true } } },
  });
  if (!ticket) throw new AppError('Ticket not found', 404);

  // ── Diff old → new so we can persist a precise audit trail ──
  // We only record fields that actually changed (data.x !== undefined
  // AND new value differs from current). A note that's set to the same
  // string isn't an "update"; nothing happened.
  type Change = { from: unknown; to: unknown };
  const changes: Record<string, Change> = {};
  const summaryParts: string[] = [];

  if (data.status && data.status !== ticket.status) {
    changes.status = { from: ticket.status, to: data.status };
    summaryParts.push(`Status: ${ticket.status} → ${data.status}`);
  }
  if (data.priority && data.priority !== ticket.priority) {
    changes.priority = { from: ticket.priority, to: data.priority };
    summaryParts.push(`Priority: ${ticket.priority} → ${data.priority}`);
  }
  if (data.adminNote !== undefined && (data.adminNote ?? null) !== (ticket.adminNote ?? null)) {
    changes.adminNote = { from: ticket.adminNote ?? null, to: data.adminNote ?? null };
    summaryParts.push(
      ticket.adminNote == null && data.adminNote
        ? 'Note added'
        : data.adminNote == null
          ? 'Note cleared'
          : 'Note edited',
    );
  }

  const updated = await prisma.maintenanceTicket.update({
    where: { id },
    data: {
      ...(data.status    && { status:    data.status }),
      ...(data.adminNote !== undefined && { adminNote: data.adminNote }),
      ...(data.priority  && { priority:  data.priority }),
    },
  });

  // Persist the audit row only if something actually changed.
  if (Object.keys(changes).length > 0) {
    await prisma.maintenanceTicketUpdate.create({
      data: {
        ticketId:  id,
        actorId:   actor?.id ?? null,
        actorName: actor?.name ?? 'System',
        summary:   summaryParts.join(' · '),
        changes:   changes as Prisma.InputJsonValue,
      },
    });
  }

  // Email the student when status actually changes — keeps inbox quiet
  // for note-only tweaks that they don't need to know about.
  if (data.status && data.status !== ticket.status) {
    const { sendEmail } = await import('./email.service');
    const { createNotification } = await import('./notification.service');
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
    void createNotification(ticket.student.id, {
      type:  'MAINTENANCE',
      title: `Ticket ${data.status.replace('_', ' ').toLowerCase()}: ${ticket.category}`,
      body:  `${ticket.location}${data.adminNote ? ` — ${data.adminNote}` : ''}`,
      link:  '/maintenance',
    });
  }

  // Re-read with the audit trail attached so the frontend has the
  // fresh state including the new update row in a single round trip.
  return prisma.maintenanceTicket.findUnique({ where: { id }, include: TICKET_INCLUDE });
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
    include: {
      student: { select: { id: true, name: true, avatarUrl: true } },
      updates: { orderBy: { createdAt: 'desc' } },
    },
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
  });
}
