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
