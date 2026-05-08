import api from './api';

export interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string | null;
  meta: Record<string, unknown> | null;
  ip: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string; role: string; avatarUrl: string | null } | null;
}

export interface AuditLogPage {
  items: AuditLogEntry[];
  pagination: { page: number; limit: number; total: number; pageCount: number };
}

export async function listAuditLogs(params: {
  action?: string; entity?: string; userId?: string;
  search?: string; page?: number; limit?: number;
} = {}) {
  const res = await api.get<{ success: boolean; data: AuditLogPage }>('/admin/audit', { params });
  return res.data.data;
}

export async function listAuditActions() {
  const res = await api.get<{ success: boolean; data: string[] }>('/admin/audit/actions');
  return res.data.data;
}
