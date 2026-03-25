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
}) => {
  const res = await api.post('/admin/vouchers', body);
  return res.data.data;
};

export const updateVoucher = async (id: string, body: Partial<{
  name: string; description: string; cost: number; stock: number; icon: string; isActive: boolean;
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

// ── Visitor Log ───────────────────────────────────────────────
export const getAdminVisitors = async (search?: string) => {
  const res = await api.get('/admin/visitors', { params: search ? { search } : {} });
  return res.data.data as AdminVisitorPass[];
};

// ── Shared Admin Types (inline for service file) ──────────────
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
}

export interface AdminVisitorPass {
  id: string; visitorName: string; visitorPhone: string;
  purpose: string; date: string; checkedInAt: string | null;
  status: string; qrCode: string;
  host: { id: string; name: string; email: string; avatarUrl: string | null };
}
