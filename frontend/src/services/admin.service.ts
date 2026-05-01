import api from './api';

// ── Overview ──────────────────────────────────────────────────
export const getAdminStats = async () => {
  const res = await api.get('/admin/stats');
  return res.data.data;
};

// ── Occupancy ─────────────────────────────────────────────────
export const getOccupancy = async (block?: string) => {
  const res = await api.get('/admin/occupancy', { params: block ? { block } : {} });
  return res.data.data as { rooms: AdminRoom[]; blocks: string[] };
};

// ── Allocations ───────────────────────────────────────────────
export const getAllocations = async (search?: string) => {
  const res = await api.get('/admin/allocations', { params: search ? { search } : {} });
  return res.data.data as AdminAllocation[];
};

export const createAllocation = async (body: {
  userId: string; roomId: string; rent: number; status?: string;
}) => {
  const res = await api.post('/admin/allocations', body);
  return res.data.data;
};

export const updateAllocation = async (id: string, body: {
  rent?: number; status?: string; endDate?: string;
}) => {
  const res = await api.patch(`/admin/allocations/${id}`, body);
  return res.data.data;
};

// ── Accounts ──────────────────────────────────────────────────
export const getAccounts = async (search?: string) => {
  const res = await api.get('/admin/accounts', { params: search ? { search } : {} });
  return res.data.data as AdminAccount[];
};

export const updateAccount = async (id: string, body: {
  name?: string; role?: string; phone?: string;
}) => {
  const res = await api.patch(`/admin/accounts/${id}`, body);
  return res.data.data;
};

// ── Rewards ───────────────────────────────────────────────────
export const getAdminVouchers = async () => {
  const res = await api.get('/admin/vouchers');
  return res.data.data as AdminVoucher[];
};

export const createVoucher = async (body: {
  name: string; description: string; cost: number; stock: number; icon: string;
  requiresProof?: boolean; taskTitle?: string; pin?: string; imageUrl?: string;
}) => {
  const res = await api.post('/admin/vouchers', body);
  return res.data.data;
};

export const updateVoucher = async (id: string, body: Partial<{
  name: string; description: string; cost: number; stock: number; icon: string;
  isActive: boolean; requiresProof: boolean; taskTitle: string; pin: string; imageUrl: string;
}>) => {
  const res = await api.patch(`/admin/vouchers/${id}`, body);
  return res.data.data;
};

export const deleteVoucher = async (id: string) => {
  await api.delete(`/admin/vouchers/${id}`);
};

export const awardCredits = async (body: {
  userId: string; amount: number; note: string;
}) => {
  const res = await api.post('/admin/credits', body);
  return res.data.data;
};

// ── Voucher Claims ────────────────────────────────────────────
export const getVoucherClaims = async (status?: string) => {
  const res = await api.get('/admin/claims', { params: status ? { status } : {} });
  return res.data.data as AdminVoucherClaim[];
};

export const approveVoucherClaim = async (id: string) => {
  const res = await api.post(`/admin/claims/${id}/approve`);
  return res.data.data;
};

export const rejectVoucherClaim = async (id: string, adminNote?: string) => {
  const res = await api.post(`/admin/claims/${id}/reject`, { adminNote });
  return res.data.data;
};

// ── Revenue Report ────────────────────────────────────────────
export const getRevenueReport = async () => {
  const res = await api.get('/admin/revenue');
  return res.data.data as RevenueReport;
};

// ── Payments (invoices for admin) ─────────────────────────────
export const getAllInvoices = async () => {
  const res = await api.get('/documents/admin/invoices');
  return res.data.data as AdminInvoice[];
};

export const clearPayment = async (id: string) => {
  const res = await api.post(`/documents/${id}/clear`);
  return res.data.data;
};

export const rejectPaymentProof = async (id: string) => {
  const res = await api.post(`/documents/${id}/reject-proof`);
  return res.data.data;
};

// ── Room Setup ────────────────────────────────────────────────
export const setupRooms = async (body: {
  count: number; type: string; blocks: number; pricePerRoom: number;
}) => {
  const res = await api.post('/admin/setup-rooms', body);
  return res.data.data as AdminRoom[];
};

// ── Settings ──────────────────────────────────────────────────
export const getSettings = async () => {
  const res = await api.get('/settings');
  return res.data.data as ResidenceSettings;
};

export const updateSettings = async (body: Partial<ResidenceSettings>) => {
  const res = await api.put('/settings', body);
  return res.data.data as ResidenceSettings;
};

// ── Visitor Log ───────────────────────────────────────────────
export const getAdminVisitors = async (search?: string) => {
  const res = await api.get('/admin/visitors', { params: search ? { search } : {} });
  return res.data.data as AdminVisitorPass[];
};

// ── Shared Admin Types ────────────────────────────────────────
export interface AdminStats {
  students:      { total: number; pending: number };
  rooms:         { total: number; occupied: number; vacant: number };
  maintenance:   { open: number; urgent: number };
  visitors:      { total: number; today: number };
  vouchers:      { active: number };
  monthlyRevenue: number;
  occupancyRate: number;
}

export interface AdminRoom {
  id: string; number: string; block: string; type: string;
  status: 'VACANT' | 'RESERVED' | 'OCCUPIED';
  price: number;
  allocation: {
    id: string; status: string; rent: number;
    user: { id: string; name: string; email: string; avatarUrl: string | null };
  } | null;
}

export interface AdminAllocation {
  id: string; status: string; rent: number;
  moveIn: string | null; createdAt: string;
  user: { id: string; name: string; email: string; avatarUrl: string | null };
  room: { id: string; number: string; block: string; type: string };
}

export interface AdminAccount {
  id: string; name: string; email: string; role: string;
  phone: string | null; university: string | null; avatarUrl: string | null;
  createdAt: string;
  wallet: { credits: number } | null;
  allocation: { room: { number: string; block: string } } | null;
}

export interface AdminVoucher {
  id: string; name: string; description: string;
  cost: number; stock: number; icon: string; isActive: boolean;
  requiresProof: boolean; taskTitle: string | null;
  pin: string | null; imageUrl: string | null;
  _count: { claims: number };
}

export interface AdminVoucherClaim {
  id: string; status: string; proofUrl: string | null;
  adminNote: string | null; approvedAt: string | null; createdAt: string;
  voucher: { id: string; name: string; icon: string; cost: number; pin: string | null; imageUrl: string | null };
  user: { id: string; name: string; email: string; avatarUrl: string | null };
}

export interface AdminVisitorPass {
  id: string; visitorName: string; visitorPhone: string;
  purpose: string; date: string; checkedInAt: string | null;
  status: string; qrCode: string;
  host: { id: string; name: string; email: string; avatarUrl: string | null };
}

export interface AdminInvoice {
  id: string; period: string; amount: string | null;
  status: string; proofUrl: string | null; proofStatus: string | null;
  clearedAt: string | null; clearedBy: string | null; createdAt: string;
  user: { id: string; name: string; email: string };
}

export interface RevenueReport {
  monthlyBreakdown: Array<{ period: string; expected: number; cleared: number; submitted: number; pending: number }>;
  projectedMonthly: number;
  latePayers: Array<{
    id: string; period: string; amount: string | null;
    status: string; proofStatus: string | null;
    user: { id: string; name: string; email: string; allocation: { rent: number } | null };
    createdAt: string;
  }>;
  totalActiveStudents: number;
}

export interface ResidenceSettings {
  id: string; name: string; tagline: string | null;
  address: string | null; phone: string | null;
  email: string | null; description: string | null;
  updatedAt: string;
}
