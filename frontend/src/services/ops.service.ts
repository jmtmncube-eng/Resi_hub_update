import api from './api';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export type OpsType =
  | 'POOL_CLEAN' | 'POOL_CHEMICAL' | 'GAS_REFILL' | 'GRASS_CUT'
  | 'ELECTRICITY_PURCHASE' | 'SOLAR_TELEMETRY' | 'OTHER';

export interface OpsService {
  id: string;
  type: OpsType;
  date: string;
  amount: string | null;        // Decimal as string from Prisma
  vendor: string | null;
  note: string | null;
  proofUrl: string | null;
  meta: Record<string, unknown> | null;
  createdById: string;
  createdAt: string;
}

export interface OpsStock {
  id: string;
  key: string;
  label: string;
  quantity: string;
  unit: string;
  threshold: string | null;
  updatedAt: string;
}

export interface CadenceStat {
  type: OpsType;
  totalCount: number;
  lastDate: string | null;
  daysSinceLast: number | null;
  avgIntervalDays: number | null;
  expectedNextDate: string | null;
  isOverdue: boolean;
}

export interface SpendStat { type: OpsType; total: number; count: number; }

export interface OpsInsights {
  cadence: CadenceStat[];
  spend30: SpendStat[];
  spend90: SpendStat[];
  spend365: SpendStat[];
  monthlyOpsCost: number;
  stock: Array<{
    key: string; label: string; quantity: number; unit: string;
    threshold: number | null; low: boolean;
  }>;
  solarKwhLast30: number;
  reminders: Array<{
    severity: 'info' | 'warn' | 'urgent';
    title: string;
    body: string;
    type?: OpsType;
  }>;
}

// ─────────────────────────────────────────────────────────────────
// Endpoints
// ─────────────────────────────────────────────────────────────────

export async function listOpsServices(filters: { type?: OpsType; from?: string; to?: string; residenceId?: string } = {}) {
  const res = await api.get<{ success: boolean; data: OpsService[] }>('/admin/ops/services', { params: filters });
  return res.data.data;
}

export async function createOpsService(input: {
  type: OpsType;
  date?: string;
  amount?: number;
  vendor?: string;
  note?: string;
  proofUrl?: string;
  meta?: Record<string, unknown>;
  residenceId?: string;
}) {
  const res = await api.post<{ success: boolean; data: OpsService }>('/admin/ops/services', input);
  return res.data.data;
}

export async function deleteOpsService(id: string) {
  await api.delete(`/admin/ops/services/${id}`);
}

export async function listOpsStock(residenceId?: string) {
  const res = await api.get<{ success: boolean; data: OpsStock[] }>('/admin/ops/stock', {
    params: residenceId ? { residenceId } : {},
  });
  return res.data.data;
}

export async function setOpsStock(
  key: string,
  body: { quantity: number; threshold?: number; residenceId?: string },
) {
  const res = await api.put<{ success: boolean; data: OpsStock }>(`/admin/ops/stock/${key}`, body);
  return res.data.data;
}

export async function getOpsInsights(residenceId?: string) {
  const res = await api.get<{ success: boolean; data: OpsInsights }>('/admin/ops/insights', {
    params: residenceId ? { residenceId } : {},
  });
  return res.data.data;
}
