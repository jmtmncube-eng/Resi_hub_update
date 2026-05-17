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

export interface ExportFilters {
  residenceId?: string;
  /** Free-text search — name or email match. Applies to all three types. */
  q?: string;
  /** Accounts only — narrows to a single Role enum value, or one of the
   *  synthetic groupings 'staff' / 'students'. */
  role?: string;
  /** Tickets: enum status value. Invoices: 'all' | 'awaiting' |
   *  'acknowledged' | 'overdue'. */
  status?: string;
  /** Tickets only — priority enum. */
  priority?: string;
  /** Invoices only — explicit proofStatus filter when the admin clicked
   *  one of the KPI tiles. Mirrors the page's `invoiceFilter` state. */
  proof?: string;
}

/** Produce a CSV string for one of the admin tables.
 *  Filters mirror exactly what the corresponding page renders, so the
 *  exported row count matches the visible list. */
export async function exportCsv(type: ExportType, f: ExportFilters = {}): Promise<string> {
  const { residenceId, q, role, status, priority, proof } = f;

  if (type === 'accounts') {
    // Build a Prisma `where` that mirrors AdminAccounts' three filters:
    // residence (tab), role (KPI tile click / pill), and search box.
    const STAFF      = ['ADMIN', 'MANAGER', 'MAINTENANCE'];
    const STUDENTS   = ['ACTIVE_STUDENT', 'PENDING_STUDENT'];
    const where: Record<string, unknown> = {};
    if (residenceId) where.allocation = { is: { room: { is: { residenceId } } } };
    if (role === 'staff')       where.role = { in: STAFF };
    else if (role === 'students') where.role = { in: STUDENTS };
    else if (role === 'pending')  where.role = 'PENDING_STUDENT';
    else if (role === 'active')   where.role = 'ACTIVE_STUDENT';
    else if (role)                where.role = role; // direct enum value
    if (q) where.OR = [
      { name:  { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
    ];

    const users = await prisma.user.findMany({
      where,
      select: {
        name: true, email: true, role: true, phone: true,
        university: true, program: true, year: true, isActive: true, createdAt: true,
        applicationStatus: true,
        allocation: { select: { room: { select: { number: true, block: true } }, status: true } },
      },
      orderBy: { name: 'asc' },
    });
    // The "to-review" tile = pending students with SUBMITTED application;
    // applied post-fetch since `role` alone can't express the
    // applicationStatus intersection cleanly.
    const filtered = role === 'to-review'
      ? users.filter(u => u.role === 'PENDING_STUDENT' && u.applicationStatus === 'SUBMITTED')
      : users;
    return toCsv(
      ['Name', 'Email', 'Role', 'Phone', 'University', 'Program', 'Year', 'Active', 'Room', 'Allocation', 'Joined'],
      filtered.map(u => [
        u.name, u.email, u.role, u.phone, u.university, u.program, u.year,
        u.isActive ? 'yes' : 'no',
        u.allocation?.room ? `${u.allocation.room.block}-${u.allocation.room.number}` : '',
        u.allocation?.status ?? '',
        u.createdAt.toISOString().slice(0, 10),
      ]),
    );
  }

  if (type === 'invoices') {
    const where: Record<string, unknown> = { type: 'INVOICE' };
    if (residenceId) where.user = { allocation: { is: { room: { is: { residenceId } } } } };
    if (q) where.user = {
      ...(where.user as object),
      OR: [
        { name:  { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ],
    };
    // Mirror the AdminPayments invoiceFilter state.
    if (proof === 'awaiting')          where.proofStatus = 'SUBMITTED';
    else if (proof === 'acknowledged') where.proofStatus = 'ACKNOWLEDGED';
    else if (proof === 'overdue')      { where.status = 'Overdue'; where.NOT = { proofStatus: 'CLEARED' }; }

    const invoices = await prisma.document.findMany({
      where: where as never,
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

  // tickets — status + priority + search
  const where: Record<string, unknown> = {};
  if (residenceId) where.residenceId = residenceId;
  // Status: 'OPEN_GROUP' folds OPEN + IN_PROGRESS (matches the page tab).
  if (status === 'OPEN_GROUP')    where.status = { in: ['OPEN', 'IN_PROGRESS'] };
  else if (status && status !== 'ALL') where.status = status;
  if (priority && priority !== 'ALL') where.priority = priority;
  if (q) where.OR = [
    { category:    { contains: q, mode: 'insensitive' } },
    { location:    { contains: q, mode: 'insensitive' } },
    { description: { contains: q, mode: 'insensitive' } },
    { student: { name:  { contains: q, mode: 'insensitive' } } },
    { student: { email: { contains: q, mode: 'insensitive' } } },
  ];
  const tickets = await prisma.maintenanceTicket.findMany({
    where: where as never,
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
