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

export async function completeChore(id: string, note?: string): Promise<Chore> {
  const res = await api.post<ApiResponse<Chore>>(`/chores/${id}/complete`, { note });
  return res.data.data;
}
