import prisma from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { persistIfDataUrl } from './storage.service';

const OPS_TYPES = [
  'POOL_CLEAN', 'POOL_CHEMICAL', 'GAS_REFILL', 'GRASS_CUT',
  'ELECTRICITY_PURCHASE', 'SOLAR_TELEMETRY', 'OTHER',
] as const;
type OpsType = typeof OPS_TYPES[number];

// ─────────────────────────────────────────────────────────────────
// Service log
// ─────────────────────────────────────────────────────────────────

export interface CreateOpsServiceInput {
  type:    OpsType;
  date?:   string;                       // ISO; defaults to now
  amount?: number;
  vendor?: string;
  note?:   string;
  proofUrl?: string;
  meta?:   Record<string, unknown>;
  residenceId?: string;
}

export async function listOpsServices(filters: { type?: OpsType; from?: string; to?: string; residenceId?: string } = {}) {
  const where: Record<string, unknown> = {};
  if (filters.type)        where.type = filters.type;
  if (filters.residenceId) where.residenceId = filters.residenceId;
  if (filters.from || filters.to) {
    const dateClause: Record<string, Date> = {};
    if (filters.from) dateClause.gte = new Date(filters.from);
    if (filters.to)   dateClause.lte = new Date(filters.to);
    where.date = dateClause;
  }
  return prisma.opsService.findMany({ where, orderBy: { date: 'desc' } });
}

export async function createOpsService(adminId: string, input: CreateOpsServiceInput) {
  if (!OPS_TYPES.includes(input.type)) throw new AppError('Invalid ops service type', 400);
  const date = input.date ? new Date(input.date) : new Date();
  if (isNaN(date.getTime())) throw new AppError('Invalid date', 400);

  return prisma.opsService.create({
    data: {
      type:        input.type,
      date,
      amount:      input.amount != null ? input.amount : null,
      vendor:      input.vendor?.trim() || null,
      note:        input.note?.trim() || null,
      proofUrl:    persistIfDataUrl(input.proofUrl, 'opsproof') || null,
      residenceId: input.residenceId ?? null,
      // Prisma JSON column rejects `Record<string, unknown>` directly;
      // serialise/deserialise to coerce into a plain InputJsonValue.
      ...(input.meta ? { meta: JSON.parse(JSON.stringify(input.meta)) } : {}),
      createdById: adminId,
    },
  });
}

export async function deleteOpsService(id: string) {
  await prisma.opsService.delete({ where: { id } }).catch(() => {
    throw new AppError('Service entry not found', 404);
  });
  return { id };
}

// ─────────────────────────────────────────────────────────────────
// Stock levels
// ─────────────────────────────────────────────────────────────────

export async function listOpsStock(residenceId?: string) {
  return prisma.opsStock.findMany({
    where:   residenceId ? { residenceId } : undefined,
    orderBy: { key: 'asc' },
  });
}

export async function setOpsStock(key: string, quantity: number, threshold?: number, residenceId?: string) {
  // Composite-unique on (residenceId, key) — find precisely the stock row
  // owned by the current residence (or the legacy NULL bucket).
  const stock = await prisma.opsStock.findFirst({
    where: { key, residenceId: residenceId ?? null },
  });
  if (!stock) throw new AppError(`Unknown stock key: ${key}`, 404);
  return prisma.opsStock.update({
    where: { id: stock.id },
    data:  {
      quantity,
      ...(threshold !== undefined && { threshold }),
    },
  });
}

// ─────────────────────────────────────────────────────────────────
// Insights — derived metrics for the Operations + Health tabs
// ─────────────────────────────────────────────────────────────────

interface CadenceStat {
  type:        OpsType;
  totalCount:  number;
  lastDate:    string | null;
  daysSinceLast: number | null;
  avgIntervalDays: number | null;     // average days between events (3+ samples)
  expectedNextDate: string | null;    // lastDate + avgInterval
  isOverdue: boolean;
}

interface SpendStat {
  type:    OpsType;
  total:   number;     // R total this period
  count:   number;
}

export interface OpsInsights {
  /** Cadence per service type — when did we last do it, how often do we do it. */
  cadence: CadenceStat[];
  /** R-spend rolled up per type for the trailing 30 / 90 / 365 days. */
  spend30:  SpendStat[];
  spend90:  SpendStat[];
  spend365: SpendStat[];
  /** Trailing-30-day total operations cost — feeds Residence Health. */
  monthlyOpsCost: number;
  /** Stock levels with explicit "low" flag. */
  stock: Array<{
    key:       string;
    label:     string;
    quantity:  number;
    unit:      string;
    threshold: number | null;
    low:       boolean;
  }>;
  /** Last-30-days reading sum from SOLAR_TELEMETRY entries (kWh). */
  solarKwhLast30: number;
  /** Heads-up reminders the UI should show prominently. */
  reminders: Array<{
    severity:  'info' | 'warn' | 'urgent';
    title:     string;
    body:      string;
    type?:     OpsType;
  }>;
}

const DEFAULT_CADENCE_DAYS: Partial<Record<OpsType, number>> = {
  POOL_CLEAN:           7,    // weekly
  GRASS_CUT:            14,   // fortnightly
  GAS_REFILL:           30,   // monthly-ish
  ELECTRICITY_PURCHASE: 30,
  POOL_CHEMICAL:        30,
  SOLAR_TELEMETRY:      1,    // daily reading ideal
};

function avgIntervalDays(dates: Date[]): number | null {
  if (dates.length < 2) return null;
  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
  let total = 0;
  for (let i = 1; i < sorted.length; i++) {
    total += (sorted[i].getTime() - sorted[i - 1].getTime()) / (1000 * 60 * 60 * 24);
  }
  return total / (sorted.length - 1);
}

export async function getOpsInsights(residenceId?: string): Promise<OpsInsights> {
  const all = await prisma.opsService.findMany({
    where:   residenceId ? { residenceId } : undefined,
    orderBy: { date: 'desc' },
  });

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const within = (entry: { date: Date }, days: number) =>
    now - entry.date.getTime() <= days * day;

  const cadence: CadenceStat[] = [];
  for (const type of OPS_TYPES) {
    const ofType = all.filter(e => e.type === type);
    const dates  = ofType.map(e => e.date);
    const last   = ofType[0]?.date ?? null;
    const avg    = avgIntervalDays(dates);
    const expectedAvg = avg ?? DEFAULT_CADENCE_DAYS[type] ?? null;
    const expectedNext = last && expectedAvg
      ? new Date(last.getTime() + expectedAvg * day)
      : null;
    const daysSince = last
      ? Math.floor((now - last.getTime()) / day)
      : null;
    const isOverdue = daysSince != null && expectedAvg != null && daysSince > expectedAvg;

    cadence.push({
      type,
      totalCount: ofType.length,
      lastDate: last ? last.toISOString() : null,
      daysSinceLast: daysSince,
      avgIntervalDays: avg,
      expectedNextDate: expectedNext ? expectedNext.toISOString() : null,
      isOverdue,
    });
  }

  function spendOver(days: number): SpendStat[] {
    return OPS_TYPES.map(type => {
      const items = all.filter(e => e.type === type && within(e, days));
      const total = items.reduce((s, e) => s + Number(e.amount ?? 0), 0);
      return { type, total, count: items.length };
    });
  }
  const spend30  = spendOver(30);
  const spend90  = spendOver(90);
  const spend365 = spendOver(365);
  const monthlyOpsCost = spend30.reduce((s, x) => s + x.total, 0);

  // Solar — sum kWh from meta over last 30 days
  const solarKwhLast30 = all
    .filter(e => e.type === 'SOLAR_TELEMETRY' && within(e, 30))
    .reduce((s, e) => {
      const m = e.meta as { kWh?: number } | null;
      return s + (m && typeof m.kWh === 'number' ? m.kWh : 0);
    }, 0);

  // Stock with low flag — scoped to the same residence (or all when null)
  const stockRaw = await prisma.opsStock.findMany({
    where:   residenceId ? { residenceId } : undefined,
    orderBy: { key: 'asc' },
  });
  const stock = stockRaw.map(s => ({
    key:       s.key,
    label:     s.label,
    quantity:  Number(s.quantity),
    unit:      s.unit,
    threshold: s.threshold != null ? Number(s.threshold) : null,
    low:       s.threshold != null && Number(s.quantity) <= Number(s.threshold),
  }));

  // Reminders
  const reminders: OpsInsights['reminders'] = [];
  for (const c of cadence) {
    if (c.totalCount === 0) continue;     // nothing logged yet → no reminder
    if (c.isOverdue && c.daysSinceLast != null && c.expectedNextDate) {
      const days = c.daysSinceLast;
      const expected = c.avgIntervalDays ?? DEFAULT_CADENCE_DAYS[c.type];
      const overBy = expected ? Math.max(0, days - expected) : 0;
      reminders.push({
        severity: overBy > (expected ?? 7) ? 'urgent' : 'warn',
        title: `${prettyType(c.type)} overdue`,
        body:  `Last done ${days} day${days === 1 ? '' : 's'} ago. ` +
               (expected ? `Typical cadence ~${Math.round(expected)} days.` : ''),
        type:  c.type,
      });
    }
  }
  for (const s of stock) {
    if (s.low) {
      reminders.push({
        severity: s.quantity === 0 ? 'urgent' : 'warn',
        title: `${s.label} running low`,
        body:  `${s.quantity}${s.unit} left (threshold ${s.threshold}${s.unit}). Reorder soon.`,
      });
    }
  }

  return {
    cadence, spend30, spend90, spend365, monthlyOpsCost,
    stock, solarKwhLast30, reminders,
  };
}

function prettyType(t: OpsType): string {
  switch (t) {
    case 'POOL_CLEAN':           return 'Pool cleaning';
    case 'POOL_CHEMICAL':        return 'Pool chemicals';
    case 'GAS_REFILL':           return 'Gas refill';
    case 'GRASS_CUT':            return 'Grass cut';
    case 'ELECTRICITY_PURCHASE': return 'Electricity top-up';
    case 'SOLAR_TELEMETRY':      return 'Solar reading';
    default:                     return 'Operations';
  }
}
