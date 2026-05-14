import api from './api';
import { ApiResponse } from '../types/api.types';
import { MaintenanceTicket } from '../types/domain.types';

export async function getMyTickets(): Promise<MaintenanceTicket[]> {
  const res = await api.get<ApiResponse<MaintenanceTicket[]>>('/maintenance');
  return res.data.data;
}

export async function getTicket(id: string): Promise<MaintenanceTicket> {
  const res = await api.get<ApiResponse<MaintenanceTicket>>(`/maintenance/${id}`);
  return res.data.data;
}

export async function createTicket(formData: FormData): Promise<MaintenanceTicket> {
  // No manual Content-Type — axios sets 'multipart/form-data; boundary=...'
  // automatically for FormData bodies. Hard-coding it without the boundary
  // breaks multer parsing on the server (photos silently dropped / 400).
  const res = await api.post<ApiResponse<MaintenanceTicket>>('/maintenance', formData);
  return res.data.data;
}

// Admin: all tickets with optional filters (including residence scope)
export async function getTickets(filters?: {
  status?: string; priority?: string; search?: string; residenceId?: string;
}): Promise<MaintenanceTicket[]> {
  const res = await api.get<ApiResponse<MaintenanceTicket[]>>('/maintenance/admin/all', {
    params: filters,
  });
  return res.data.data;
}

// Admin: update ticket status / priority / adminNote
export async function updateTicket(
  id: string,
  data: { status?: string; priority?: string; adminNote?: string },
): Promise<MaintenanceTicket> {
  const res = await api.patch<ApiResponse<MaintenanceTicket>>(`/maintenance/${id}`, data);
  return res.data.data;
}
