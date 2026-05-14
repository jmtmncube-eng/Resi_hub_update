import prisma from '../config/database';

// ============================================================
//  Global search + CSV export
// ============================================================
//  globalSearch — one query box across the things an admin looks up
//  most: residents/staff, rooms, invoices, tickets. Each category is
//  capped so the dropdown stays snappy.
//
//  exportCsv — streams the key admin tables as CSV. Values are escaped
//  per RFC 4180 (quote-wrap anything with a comma, quote, or newline;
//  double internal quotes).
// ============================================================

const PER_CATEGORY = 8;

export interface SearchResults {
  residents: { id: string; name: string; email: string; role: string }[];
  rooms:     { id: string; number: string; block: string; type: string; status: string }[];
  invoices:  { id: string; userId: string; userName: string; period: string; amount: string | null; status: string }[];
  tickets:   { id: string; category: string; location: string; status: string; studentName: string }[];
}

/** Search residents, rooms, invoices and tickets in one shot. */
export async function globalSearch(rawQ: string, residenceId?: string): Promise<SearchResults> {
  const q = rawQ.trim();
  if (q.length < 2) {
    return { residents: [], rooms: [], invoices: [], tickets: [] };
  }
  const contains = { contains: q, mode: 'insensitive' as const };

  const [residents, rooms, invoices, tickets] = await Promise.all([
    prisma.user.findMany({
      where: {
        OR: [{ name: contains }, { email: contains }],
        ...(residenceId ? { allocation: { is: { room: { is: { residenceId } } } } } : {}),
      },
      select: { id: true, name: true, email: true, role: true },
      take: PER_CATEGORY,
      orderBy: { name: 'asc' },
    }),
    prisma.room.findMany({
      where: {
        OR: [{ number: contains }, { block: contains }],
        ...(residenceId ? { residenceId } : {}),
      },
      select: { id: true, number: true, block: true, type: true, status: true },
      take: PER_CATEGORY,
      orderBy: { number: 'asc' },
    }),
    prisma.document.findMany({
      where: {
        type: 'INVOICE',
        OR: [{ period: contains }, { user: { name: contains } }],
        ...(residenceId ? { user: { allocation: { is: { room: { is: { residenceId } } } } } } : {}),
      },
      select: { id: true, userId: true, period: true, amount: true, status: true, user: { select: { name: true } } },
      take: PER_CATEGORY,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.maintenanceTicket.findMany({
      where: {
        OR: [{ category: contains }, { location: contains }, { student: { name: contains } }],
        ...(residenceId ? { residenceId } : {}),
      },
      select: { id: true, category: true, location: true, status: true, student: { select: { name: true } } },
      take: PER_CATEGORY,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return {
    residents,
    rooms,
    invoices: invoices.map(i => ({
      id: i.id, userId: i.userId, userName: i.user.name,
      period: i.period, amount: i.amount, status: i.status,
    })),
    tickets: tickets.map(t => ({
      id: t.id, category: t.category, location: t.location,
      status: t.status, studentName: t.student?.name ?? '—',
    })),
  };
}

// ── CSV export ─────────────────────────────────────────────────

/** RFC-4180 escape for a single field. */
function csvField(v: unknown): string {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Build a CSV document from a header row + data rows. */
function toCsv(header: string[], rows: unknown[][]): string {
  const lines = [header, ...rows].map(r => r.map(csvField).join(','));
  return lines.join('\r\n');
}

export type ExportType = 'accounts' | 'invoices' | 'tickets';

/** Produce a CSV string for one of the admin tables. */
export async function exportCsv(type: ExportType, residenceId?: string): Promise<string> {
  if (type === 'accounts') {
    const users = await prisma.user.findMany({
      where: residenceId ? { allocation: { is: { room: { is: { residenceId } } } } } : undefined,
      select: {
        name: true, email: true, role: true, phone: true,
        university: true, program: true, year: true, isActive: true, createdAt: true,
        allocation: { select: { room: { select: { number: true, block: true } }, status: true } },
      },
      orderBy: { name: 'asc' },
    });
    return toCsv(
      ['Name', 'Email', 'Role', 'Phone', 'University', 'Program', 'Year', 'Active', 'Room', 'Allocation', 'Joined'],
      users.map(u => [
        u.name, u.email, u.role, u.phone, u.university, u.program, u.year,
        u.isActive ? 'yes' : 'no',
        u.allocation?.room ? `${u.allocation.room.block}-${u.allocation.room.number}` : '',
        u.allocation?.status ?? '',
        u.createdAt.toISOString().slice(0, 10),
      ]),
    );
  }

  if (type === 'invoices') {
    const invoices = await prisma.document.findMany({
      where: {
        type: 'INVOICE',
        ...(residenceId ? { user: { allocation: { is: { room: { is: { residenceId } } } } } } : {}),
      },
      select: {
        period: true, amount: true, status: true, proofStatus: true,
        clearedAt: true, createdAt: true, user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return toCsv(
      ['Resident', 'Email', 'Period', 'Amount', 'Status', 'Proof status', 'Cleared', 'Raised'],
      invoices.map(i => [
        i.user.name, i.user.email, i.period, i.amount, i.status, i.proofStatus ?? '',
        i.clearedAt ? i.clearedAt.toISOString().slice(0, 10) : '',
        i.createdAt.toISOString().slice(0, 10),
      ]),
    );
  }

  // tickets
  const tickets = await prisma.maintenanceTicket.findMany({
    where: residenceId ? { residenceId } : undefined,
    select: {
      category: true, location: true, description: true, priority: true,
      status: true, adminNote: true, createdAt: true,
      student: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return toCsv(
    ['Resident', 'Email', 'Category', 'Location', 'Description', 'Priority', 'Status', 'Admin note', 'Raised'],
    tickets.map(t => [
      t.student?.name ?? '', t.student?.email ?? '', t.category, t.location, t.description,
      t.priority, t.status, t.adminNote ?? '',
      t.createdAt.toISOString().slice(0, 10),
    ]),
  );
}
