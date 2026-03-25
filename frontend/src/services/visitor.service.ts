import api from './api';
import { ApiResponse } from '../types/api.types';
import { VisitorPass } from '../types/domain.types';

export interface CreateVisitorInput {
  visitorName:  string;
  visitorPhone: string;
  date:         string;
  timeFrom:     string;
  timeTo:       string;
  purpose:      string;
}

export async function getMyPasses(): Promise<VisitorPass[]> {
  const res = await api.get<ApiResponse<VisitorPass[]>>('/visitors');
  return res.data.data;
}

export async function createPass(data: CreateVisitorInput): Promise<VisitorPass> {
  const res = await api.post<ApiResponse<VisitorPass>>('/visitors', data);
  return res.data.data;
}

export async function cancelPass(id: string): Promise<VisitorPass> {
  const res = await api.delete<ApiResponse<VisitorPass>>(`/visitors/${id}`);
  return res.data.data;
}
