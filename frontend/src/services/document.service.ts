import api from './api';
import { ApiResponse } from '../types/api.types';
import { ResidentDocument } from '../types/domain.types';

export async function getMyDocuments(): Promise<ResidentDocument[]> {
  const res = await api.get<ApiResponse<ResidentDocument[]>>('/documents');
  return res.data.data;
}

export async function signContract(id: string, signedByName: string): Promise<ResidentDocument> {
  const res = await api.post<ApiResponse<ResidentDocument>>(`/documents/${id}/sign`, { signedByName });
  return res.data.data;
}

/** Student uploads base64 proof-of-payment image */
export async function submitPaymentProof(id: string, proofUrl: string): Promise<ResidentDocument> {
  const res = await api.post<ApiResponse<ResidentDocument>>(`/documents/${id}/proof`, { proofUrl });
  return res.data.data;
}

/** Student creates a rent invoice for a specific month — server uses their allocation rent. */
export async function initiateRentInvoice(period: string): Promise<ResidentDocument> {
  const res = await api.post<ApiResponse<ResidentDocument>>('/documents/invoices/initiate', { period });
  return res.data.data;
}

export interface BulkInvoiceResult {
  period: string;
  created: number;
  skipped: number;
  totalActive: number;
  invoices: Array<{ id: string; userId: string; userName: string; amount: string }>;
}

/** Admin generates rent invoices for all active students for a chosen month. */
export async function bulkCreateInvoices(period: string, includeOwing: boolean): Promise<BulkInvoiceResult> {
  const res = await api.post<ApiResponse<BulkInvoiceResult>>('/documents/admin/invoices/bulk', { period, includeOwing });
  return res.data.data;
}
