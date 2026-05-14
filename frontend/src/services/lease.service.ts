import api from './api';
import { ApiResponse } from '../types/api.types';

export type DepositStatus = 'NONE' | 'HELD' | 'PARTIALLY_REFUNDED' | 'REFUNDED';
export type InspectionType = 'MOVE_IN' | 'ROUTINE' | 'MOVE_OUT';
export type AllocationStatus = 'RESERVED' | 'ACTIVE' | 'ENDED';

export interface Inspection {
  id:          string;
  type:        InspectionType;
  inspectedAt: string;
  condition:   string;
  notes:       string | null;
  photoUrls:   string[];
  inspectorId: string | null;
  createdAt:   string;
}

export interface LeaseView {
  id:                 string;
  status:             AllocationStatus;
  moveIn:             string | null;
  rent:               string | number;
  balance:            string | number;
  leaseStart:         string | null;
  leaseEnd:           string | null;
  depositAmount:      string | number | null;
  depositStatus:      DepositStatus;
  depositRefunded:    string | number | null;
  depositNote:        string | null;
  noticeGivenAt:      string | null;
  moveOutDate:        string | null;
  moveOutCompletedAt: string | null;
  createdAt:          string;
  room: {
    id: string; number: string; block: string; type: string;
    price: string | number;
    residence: { id: string; name: string } | null;
  };
  inspections: Inspection[];
}

// ── Student ────────────────────────────────────────────────────
export async function getMyLease(): Promise<LeaseView | null> {
  const res = await api.get<ApiResponse<LeaseView | null>>('/lease/me');
  return res.data.data;
}
export async function giveNoticeSelf(): Promise<LeaseView> {
  const res = await api.post<ApiResponse<LeaseView>>('/lease/me/give-notice');
  return res.data.data;
}

// ── Admin / management ─────────────────────────────────────────
export async function getLease(allocationId: string): Promise<LeaseView> {
  const res = await api.get<ApiResponse<LeaseView>>(`/lease/${allocationId}`);
  return res.data.data;
}
export async function updateLeaseTerms(
  allocationId: string, body: { leaseStart?: string | null; leaseEnd?: string | null },
): Promise<LeaseView> {
  const res = await api.patch<ApiResponse<LeaseView>>(`/lease/${allocationId}/terms`, body);
  return res.data.data;
}
export async function recordDeposit(
  allocationId: string, body: { amount: number; note?: string },
): Promise<LeaseView> {
  const res = await api.post<ApiResponse<LeaseView>>(`/lease/${allocationId}/deposit`, body);
  return res.data.data;
}
export async function refundDeposit(
  allocationId: string, body: { amount: number; note?: string },
): Promise<LeaseView> {
  const res = await api.post<ApiResponse<LeaseView>>(`/lease/${allocationId}/deposit/refund`, body);
  return res.data.data;
}
export async function giveNotice(allocationId: string): Promise<LeaseView> {
  const res = await api.post<ApiResponse<LeaseView>>(`/lease/${allocationId}/give-notice`);
  return res.data.data;
}
export async function scheduleMoveOut(
  allocationId: string, body: { moveOutDate: string },
): Promise<LeaseView> {
  const res = await api.post<ApiResponse<LeaseView>>(`/lease/${allocationId}/move-out/schedule`, body);
  return res.data.data;
}
export async function completeMoveOut(allocationId: string): Promise<LeaseView> {
  const res = await api.post<ApiResponse<LeaseView>>(`/lease/${allocationId}/move-out/complete`);
  return res.data.data;
}
export async function renewLease(
  allocationId: string, body: { leaseEnd: string; rent?: number },
): Promise<LeaseView> {
  const res = await api.post<ApiResponse<LeaseView>>(`/lease/${allocationId}/renew`, body);
  return res.data.data;
}
export async function listInspections(allocationId: string): Promise<Inspection[]> {
  const res = await api.get<ApiResponse<Inspection[]>>(`/lease/${allocationId}/inspections`);
  return res.data.data;
}
export async function createInspection(
  allocationId: string,
  body: { type: InspectionType; condition: string; notes?: string; photoUrls?: string[] },
): Promise<Inspection> {
  const res = await api.post<ApiResponse<Inspection>>(`/lease/${allocationId}/inspections`, body);
  return res.data.data;
}
