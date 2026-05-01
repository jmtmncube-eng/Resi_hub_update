import api from './api';
import { ApiResponse } from '../types/api.types';
import { Chore } from '../types/domain.types';

export async function getChores(block?: string): Promise<Chore[]> {
  const res = await api.get<ApiResponse<Chore[]>>('/chores', { params: block ? { block } : {} });
  return res.data.data;
}

export async function claimChore(id: string): Promise<Chore> {
  const res = await api.post<ApiResponse<Chore>>(`/chores/${id}/claim`);
  return res.data.data;
}

export async function unclaimChore(id: string): Promise<Chore> {
  const res = await api.post<ApiResponse<Chore>>(`/chores/${id}/unclaim`);
  return res.data.data;
}

export async function completeChore(id: string, proofUrl: string, note?: string): Promise<Chore> {
  const res = await api.post<ApiResponse<Chore>>(`/chores/${id}/complete`, { proofUrl, note });
  return res.data.data;
}

/* ── Admin ──────────────────────────────────────────────────── */

export async function getChorePendingApprovals(): Promise<Chore[]> {
  const res = await api.get<ApiResponse<Chore[]>>('/chores/admin/pending');
  return res.data.data;
}

export async function approveChoreProof(id: string): Promise<Chore> {
  const res = await api.post<ApiResponse<Chore>>(`/chores/admin/${id}/approve`);
  return res.data.data;
}

export async function rejectChoreProof(id: string, adminNote?: string): Promise<Chore> {
  const res = await api.post<ApiResponse<Chore>>(`/chores/admin/${id}/reject`, { adminNote });
  return res.data.data;
}
