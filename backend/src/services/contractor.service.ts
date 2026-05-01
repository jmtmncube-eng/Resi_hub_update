import prisma from '../config/database';
import { AppError } from '../middleware/error.middleware';

const CONTRACTOR_TYPES = ['CLEANER', 'GROUNDSKEEPER', 'GARDENER', 'OTHER'] as const;
type ContractorType = typeof CONTRACTOR_TYPES[number];

function assertType(t: string): asserts t is ContractorType {
  if (!CONTRACTOR_TYPES.includes(t as ContractorType)) {
    throw new AppError(`Invalid contractor type: ${t}`, 400);
  }
}

export async function listContractors(residenceId?: string) {
  return prisma.serviceContractor.findMany({
    where: residenceId ? { residenceId } : undefined,
    include: {
      invoices: { orderBy: { period: 'desc' }, take: 6 },
      residence: { select: { id: true, name: true } },
    },
    orderBy: [{ active: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function createContractor(data: {
  residenceId: string; type: string; name: string;
  phone?: string; email?: string;
  rate: number; rateUnit?: string;
  startDate: string; endDate?: string;
  notes?: string;
}) {
  assertType(data.type);
  if (!data.name?.trim()) throw new AppError('Name is required', 400);
  if (!data.residenceId)  throw new AppError('residenceId is required', 400);
  if (!data.rate || data.rate <= 0) throw new AppError('Rate must be positive', 400);

  const residence = await prisma.residence.findUnique({ where: { id: data.residenceId } });
  if (!residence) throw new AppError('Residence not found', 404);

  const start = new Date(data.startDate);
  if (isNaN(start.getTime())) throw new AppError('Invalid start date', 400);
  const end = data.endDate ? new Date(data.endDate) : null;
  if (end && isNaN(end.getTime())) throw new AppError('Invalid end date', 400);

  return prisma.serviceContractor.create({
    data: {
      residenceId: data.residenceId,
      type:        data.type,
      name:        data.name.trim(),
      phone:       data.phone?.trim() || null,
      email:       data.email?.trim() || null,
      rate:        data.rate,
      rateUnit:    data.rateUnit ?? 'month',
      startDate:   start,
      endDate:     end,
      notes:       data.notes?.trim() || null,
      active:      true,
    },
  });
}

export async function updateContractor(id: string, data: Partial<{
  name: string; phone: string; email: string;
  rate: number; rateUnit: string;
  endDate: string; active: boolean; notes: string;
}>) {
  const existing = await prisma.serviceContractor.findUnique({ where: { id } });
  if (!existing) throw new AppError('Contractor not found', 404);
  return prisma.serviceContractor.update({
    where: { id },
    data: {
      ...(data.name     !== undefined && { name: data.name.trim() }),
      ...(data.phone    !== undefined && { phone: data.phone?.trim() || null }),
      ...(data.email    !== undefined && { email: data.email?.trim() || null }),
      ...(data.rate     !== undefined && { rate: data.rate }),
      ...(data.rateUnit !== undefined && { rateUnit: data.rateUnit }),
      ...(data.endDate  !== undefined && { endDate: data.endDate ? new Date(data.endDate) : null }),
      ...(data.active   !== undefined && { active: data.active }),
      ...(data.notes    !== undefined && { notes: data.notes?.trim() || null }),
    },
  });
}

export async function endContractor(id: string) {
  const existing = await prisma.serviceContractor.findUnique({ where: { id } });
  if (!existing) throw new AppError('Contractor not found', 404);
  return prisma.serviceContractor.update({
    where: { id },
    data:  { active: false, endDate: new Date() },
  });
}

// ─────────────────────────────────────────────────────────────────
// Invoices owed to contractors
// ─────────────────────────────────────────────────────────────────

function assertValidPeriod(period: string): void {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
    throw new AppError('Period must be YYYY-MM', 400);
  }
}

/** Generate (or fetch) the invoice for a single contractor for a given month. */
export async function generateContractorInvoice(contractorId: string, period: string) {
  assertValidPeriod(period);
  const c = await prisma.serviceContractor.findUnique({ where: { id: contractorId } });
  if (!c)         throw new AppError('Contractor not found', 404);
  if (!c.active)  throw new AppError('Contractor is no longer active', 400);

  const existing = await prisma.contractorInvoice.findUnique({
    where: { contractorId_period: { contractorId, period } },
  });
  if (existing) return existing;

  return prisma.contractorInvoice.create({
    data: {
      contractorId,
      period,
      amount: Number(c.rate),
      status: 'Pending',
    },
  });
}

/** Generate invoices for every active contractor (optionally scoped to a residence) for `period`. */
export async function generateAllContractorInvoices(period: string, residenceId?: string) {
  assertValidPeriod(period);
  const contractors = await prisma.serviceContractor.findMany({
    where: { active: true, ...(residenceId && { residenceId }) },
  });

  const created: Array<{ id: string; contractorId: string; period: string; amount: string }> = [];
  let skipped = 0;
  for (const c of contractors) {
    const exists = await prisma.contractorInvoice.findUnique({
      where: { contractorId_period: { contractorId: c.id, period } },
    });
    if (exists) { skipped++; continue; }
    const inv = await prisma.contractorInvoice.create({
      data: { contractorId: c.id, period, amount: Number(c.rate), status: 'Pending' },
    });
    created.push({ id: inv.id, contractorId: c.id, period, amount: String(inv.amount) });
  }
  return { created: created.length, skipped, total: contractors.length, invoices: created };
}

export async function listContractorInvoices(contractorId?: string) {
  return prisma.contractorInvoice.findMany({
    where: contractorId ? { contractorId } : undefined,
    include: { contractor: { select: { id: true, name: true, type: true, residenceId: true } } },
    orderBy: [{ status: 'asc' }, { period: 'desc' }],
  });
}

export async function markContractorInvoicePaid(id: string, proofUrl?: string) {
  const inv = await prisma.contractorInvoice.findUnique({ where: { id } });
  if (!inv) throw new AppError('Invoice not found', 404);
  return prisma.contractorInvoice.update({
    where: { id },
    data:  { status: 'Paid', paidAt: new Date(), ...(proofUrl && { proofUrl }) },
  });
}
