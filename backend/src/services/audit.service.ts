import prisma from '../config/database';

export interface AuditFilter {
  action?: string;
  entity?: string;
  userId?: string;
  search?: string;
  page?:   number;
  limit?:  number;
}

/**
 * Paginated audit-log fetch for the admin "Activity" page.
 * Returns items + total count so the UI can show "page X of Y".
 */
export async function listAuditLogs(filter: AuditFilter = {}) {
  const page  = Math.max(1, filter.page ?? 1);
  const limit = Math.min(100, Math.max(1, filter.limit ?? 30));

  const where: Record<string, unknown> = {};
  if (filter.action) where.action = filter.action;
  if (filter.entity) where.entity = filter.entity;
  if (filter.userId) where.userId = filter.userId;
  if (filter.search) {
    where.OR = [
      { action: { contains: filter.search, mode: 'insensitive' } },
      { entity: { contains: filter.search, mode: 'insensitive' } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip:    (page - 1) * limit,
      take:    limit,
      include: { user: { select: { id: true, name: true, email: true, role: true, avatarUrl: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    items,
    pagination: {
      page, limit, total,
      pageCount: Math.ceil(total / limit),
    },
  };
}

/** Distinct action names for filter chips. */
export async function listAuditActions(): Promise<string[]> {
  const rows = await prisma.auditLog.findMany({
    distinct: ['action'],
    select:   { action: true },
    orderBy:  { action: 'asc' },
  });
  return rows.map(r => r.action);
}
