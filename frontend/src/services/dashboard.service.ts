import api from './api';
import { ApiResponse } from '../types/api.types';
import { DashboardData } from '../types/domain.types';

export async function getDashboard(): Promise<DashboardData> {
  const res = await api.get<ApiResponse<DashboardData>>('/dashboard');
  return res.data.data;
}
