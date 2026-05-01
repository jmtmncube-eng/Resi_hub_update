import api from './api';

export interface ResidenceSummary {
  id: string;
  name: string;
  tagline: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  description: string | null;
  createdAt: string;
  roomCount: number;
  contractorCount: number;
  totalSlots: number;
  filledSlots: number;
  occupancyPct: number;
  projectedMonthly: number;
}

export type ContractorType = 'CLEANER' | 'GROUNDSKEEPER' | 'GARDENER' | 'OTHER';

export interface Contractor {
  id: string;
  residenceId: string;
  type: ContractorType;
  name: string;
  phone: string | null;
  email: string | null;
  rate: string;
  rateUnit: string;
  startDate: string;
  endDate: string | null;
  active: boolean;
  notes: string | null;
  createdAt: string;
  invoices: ContractorInvoice[];
  residence?: { id: string; name: string };
}

export interface ContractorInvoice {
  id: string;
  contractorId: string;
  period: string;
  amount: string;
  status: 'Pending' | 'Paid';
  proofUrl: string | null;
  paidAt: string | null;
  createdAt: string;
  contractor?: { id: string; name: string; type: ContractorType; residenceId: string };
}

// ─────────────────────────────────────────────────────────────────
// Residences
// ─────────────────────────────────────────────────────────────────

export async function listResidences(): Promise<ResidenceSummary[]> {
  const res = await api.get<{ success: boolean; data: ResidenceSummary[] }>('/admin/residences');
  return res.data.data;
}

export async function createResidence(body: {
  name: string; tagline?: string; address?: string;
  phone?: string; email?: string; description?: string;
}) {
  const res = await api.post<{ success: boolean; data: ResidenceSummary }>('/admin/residences', body);
  return res.data.data;
}

export async function updateResidence(id: string, body: Partial<{
  name: string; tagline: string; address: string;
  phone: string; email: string; description: string;
}>) {
  const res = await api.patch<{ success: boolean; data: ResidenceSummary }>(`/admin/residences/${id}`, body);
  return res.data.data;
}

export async function archiveResidence(id: string) {
  await api.delete(`/admin/residences/${id}`);
}

// ─────────────────────────────────────────────────────────────────
// Contractors
// ─────────────────────────────────────────────────────────────────

export async function listContractors(residenceId?: string): Promise<Contractor[]> {
  const res = await api.get<{ success: boolean; data: Contractor[] }>('/admin/residences/contractors', {
    params: residenceId ? { residenceId } : {},
  });
  return res.data.data;
}

export async function createContractor(body: {
  residenceId: string; type: ContractorType; name: string;
  phone?: string; email?: string;
  rate: number; rateUnit?: string;
  startDate: string; endDate?: string;
  notes?: string;
}) {
  const res = await api.post<{ success: boolean; data: Contractor }>('/admin/residences/contractors', body);
  return res.data.data;
}

export async function updateContractor(id: string, body: Partial<{
  name: string; phone: string; email: string;
  rate: number; rateUnit: string;
  endDate: string; active: boolean; notes: string;
}>) {
  const res = await api.patch<{ success: boolean; data: Contractor }>(`/admin/residences/contractors/${id}`, body);
  return res.data.data;
}

export async function endContractor(id: string) {
  const res = await api.post<{ success: boolean; data: Contractor }>(`/admin/residences/contractors/${id}/end`);
  return res.data.data;
}

export async function generateContractorInvoiceBulk(period: string, residenceId?: string) {
  const res = await api.post<{ success: boolean; data: { created: number; skipped: number; total: number } }>(
    '/admin/residences/contractor-invoices/bulk', { period, residenceId },
  );
  return res.data.data;
}

export async function listContractorInvoices(contractorId?: string): Promise<ContractorInvoice[]> {
  const res = await api.get<{ success: boolean; data: ContractorInvoice[] }>('/admin/residences/contractor-invoices', {
    params: contractorId ? { contractorId } : {},
  });
  return res.data.data;
}

export async function markContractorInvoicePaid(id: string, proofUrl?: string) {
  const res = await api.post<{ success: boolean; data: ContractorInvoice }>(
    `/admin/residences/contractor-invoices/${id}/paid`, { proofUrl },
  );
  return res.data.data;
}
