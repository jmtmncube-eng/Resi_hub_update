import api from './api';

// ── Overview ──────────────────────────────────────────────────
export const getAdminStats = async (residenceId?: string) => {
  const res = await api.get('/admin/stats', { params: residenceId ? { residenceId } : {} });
  return res.data.data;
};

// ── Occupancy ─────────────────────────────────────────────────
export const getOccupancy = async (block?: string, residenceId?: string) => {
  const params: Record<string, string> = {};
  if (block)       params.block = block;
  if (residenceId) params.residenceId = residenceId;
  const res = await api.get('/admin/occupancy', { params });
  return res.data.data as { rooms: AdminRoom[]; blocks: string[] };
};

// ── Allocations ───────────────────────────────────────────────
export const getAllocations = async (search?: string) => {
  const res = await api.get('/admin/allocations', { params: search ? { search } : {} });
  return res.data.data as AdminAllocation[];
};

export const createAllocation = async (body: {
  userId: string; roomId: string; rent: number; status?: string;
  electricitySelfManaged?: boolean;
}) => {
  const res = await api.post('/admin/allocations', body);
  return res.data.data;
};

export const updateAllocation = async (id: string, body: {
  rent?: number; status?: string; endDate?: string;
  electricitySelfManaged?: boolean;
}) => {
  const res = await api.patch(`/admin/allocations/${id}`, body);
  return res.data.data;
};

export const removeAllocation = async (id: string) => {
  const res = await api.delete(`/admin/allocations/${id}`);
  return res.data.data;
};

/** Move a student from their current room to a new one in one transaction. */
export const moveAllocation = async (body: {
  userId: string; targetRoomId: string; rent: number; status?: 'ACTIVE' | 'RESERVED';
}) => {
  const res = await api.post('/admin/allocations/move', body);
  return res.data.data;
};

// ── Accounts ──────────────────────────────────────────────────
export const getAccounts = async (search?: string) => {
  const res = await api.get('/admin/accounts', { params: search ? { search } : {} });
  return res.data.data as AdminAccount[];
};

export const updateAccount = async (id: string, body: {
  name?: string; email?: string; role?: string; phone?: string;
  university?: string; program?: string; year?: number | null; bio?: string;
}) => {
  const res = await api.patch(`/admin/accounts/${id}`, body);
  return res.data.data;
};

export const approveAccount = async (id: string) => {
  const res = await api.post(`/admin/accounts/${id}/approve`);
  return res.data.data;
};

export const setAccountActive = async (id: string, isActive: boolean) => {
  const res = await api.post(`/admin/accounts/${id}/active`, { isActive });
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
  name: string; description: string; cost: number; stock: number; icon: string;
  isActive: boolean;
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

// ── Revenue Report ────────────────────────────────────────────
export const getRevenueReport = async (residenceId?: string) => {
  const res = await api.get('/admin/revenue', { params: residenceId ? { residenceId } : {} });
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
  residenceId?: string;
}) => {
  const res = await api.post('/admin/setup-rooms', body);
  return res.data.data as AdminRoom[];
};

/** Hard-delete a single room. Backend refuses if any tenants are attached. */
export const deleteRoom = async (id: string) => {
  const res = await api.delete(`/admin/rooms/${id}`);
  return res.data.data as { id: string; number: string };
};

/** Create a single room — for adding incrementally without re-running the bulk wizard. */
export const createRoom = async (body: {
  number: string; block: string; type: string;
  capacity?: number; price: number; residenceId?: string;
}) => {
  const res = await api.post('/admin/rooms', body);
  return res.data.data as AdminRoom;
};

// ── Account overview (drawer) ─────────────────────────────────
export interface AccountOverview {
  id: string; name: string; email: string; phone: string | null; role: string;
  avatarUrl: string | null; isActive: boolean;
  university: string | null; program: string | null; year: number | null; bio: string | null;
  idNumber: string | null;
  applicationStatus: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  applicationSubmittedAt: string | null;
  applicationApprovedAt: string | null;
  applicationRejectedAt: string | null;
  applicationAdminNote: string | null;
  onboardedAt: string | null;
  createdAt: string;
  wallet: { credits: number } | null;
  allocation: {
    id: string;
    status: 'RESERVED' | 'ACTIVE' | 'ENDED';
    moveIn: string | null;
    rent: string;
    balance: string;
    createdAt: string;
    room: {
      id: string; number: string; block: string;
      type: 'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'QUAD' | 'STUDIO';
      capacity: number; price: string;
      residence: { id: string; name: string } | null;
    };
  } | null;
  documents: Array<{
    id: string; type: 'INVOICE' | 'CONTRACT';
    period: string; amount: string | null; status: string;
    proofStatus: string | null; signedAt: string | null; clearedAt: string | null;
    createdAt: string;
  }>;
  stats: {
    openTickets: number; totalTickets: number;
    upcomingPasses: number; totalPasses: number;
    monthsUnpaid: number; monthsPaid: number;
  };
}

export const getAccountOverview = async (id: string) => {
  const res = await api.get(`/admin/accounts/${id}/overview`);
  return res.data.data as AccountOverview;
};

/** Mixed-type generation — pass an array of slices: e.g. 5 SINGLE + 4 DOUBLE + 2 QUAD. */
export const setupRoomsMixed = async (body: {
  blocks: number;
  mix:    Array<{ type: string; count: number; price: number }>;
  residenceId?: string;
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
/** Force-check-out a visitor pass when student forgot. */
export const adminCheckOutVisitor = async (id: string) => {
  const res = await api.patch(`/visitors/${id}/checkout`);
  return res.data.data;
};

/** Hard-delete a visitor pass (admin only — students can only cancel their own). */
export const adminDeleteVisitor = async (id: string) => {
  const res = await api.delete(`/visitors/admin/${id}`);
  return res.data.data;
};

/** Force-check-in a visitor pass (e.g. gate guard couldn't, admin bypasses). */
export const adminCheckInVisitor = async (id: string) => {
  const res = await api.patch(`/visitors/${id}/checkin`);
  return res.data.data;
};

export const getAdminVisitors = async (search?: string) => {
  const res = await api.get('/admin/visitors', { params: search ? { search } : {} });
  return res.data.data as AdminVisitorPass[];
};

// ── Shared Admin Types ────────────────────────────────────────
export interface AdminStats {
  students:      { total: number; pending: number };
  rooms: {
    total: number; occupied: number; vacant: number;
    /** Total bed-slots across all rooms (sum of capacities). */
    totalSlots: number;
    /** Active allocations — i.e. slots actually filled. */
    filledSlots: number;
    /** filledSlots / totalSlots × 100. More accurate than room-level for shared rooms. */
    slotOccupancyRate: number;
  };
  maintenance:   { open: number; urgent: number };
  visitors:      { total: number; today: number };
  vouchers:      { active: number };
  /** Sum of all active rents — what the residence WOULD collect if everyone paid. */
  monthlyRevenue: number;
  /** OpsService entries logged in the last 30 days (pool, gas, electricity, etc). */
  monthlyOpsCost: number;
  /** ContractorInvoice paid in the last 30 days — gardener, cleaner, etc. */
  monthlyContractorCost: number;
  /** Sum of the two above. */
  monthlyTotalCost: number;
  /** monthlyRevenue − monthlyTotalCost (projected, not realised). */
  netMonthly: number;
  /** Legacy room-level rate. Prefer rooms.slotOccupancyRate. */
  occupancyRate: number;
}

export interface AdminRoom {
  id: string; number: string; block: string; type: string;
  status: 'VACANT' | 'RESERVED' | 'OCCUPIED';
  price: number;
  capacity: number;
  occupied: number;
  reserved: number;
  vacantSlots: number;
  tenants: Array<{
    allocationId: string;
    status: 'ACTIVE' | 'RESERVED' | 'ENDED';
    rent: number;
    moveIn: string | null;
    user: { id: string; name: string; email: string; avatarUrl: string | null };
  }>;
  /** Back-compat: first tenant of the room (legacy). */
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
  phone: string | null; university: string | null;
  program?: string | null; year?: number | null; bio?: string | null;
  avatarUrl: string | null;
  isActive?: boolean;
  createdAt: string;
  wallet: { credits: number } | null;
  allocation: { room: { number: string; block: string } } | null;
}

export interface AdminVoucher {
  id: string; name: string; description: string;
  cost: number; stock: number; icon: string; isActive: boolean;
  _count: { claims: number };
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
  autoInvoiceEnabled: boolean;
  autoInvoiceDay: number;
  autoInvoiceLastRun: string | null;
  updatedAt: string;
}
