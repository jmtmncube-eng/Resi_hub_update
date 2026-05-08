import api from './api';
import { ApiResponse } from '../types/api.types';

export interface ApplicationAllocation {
  id:        string;
  status:    'RESERVED' | 'ACTIVE' | 'ENDED';
  moveIn:    string | null;
  rent:      string;
  createdAt: string;
  room: {
    id:     string;
    number: string;
    block:  string;
    type:   'SINGLE' | 'DOUBLE' | 'STUDIO';
    price:  string;
  };
}

export type ApplicationDocType = 'ID_DOC' | 'PROOF_REGISTRATION' | 'PROOF_FUNDING' | 'SIGNATURE';
export type ApplicationStatusValue = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export interface ApplicationDocument {
  id:        string;
  type:      ApplicationDocType;
  status:    string;
  fileUrl:   string | null;
  createdAt: string;
}

export interface ApplicationStatus {
  id:                     string;
  name:                   string;
  email:                  string;
  role:                   string;
  university:             string | null;
  program:                string | null;
  year:                   number | null;
  idNumber:               string | null;
  applicationStatus:      ApplicationStatusValue;
  applicationSubmittedAt: string | null;
  applicationApprovedAt:  string | null;
  applicationRejectedAt:  string | null;
  applicationAdminNote:   string | null;
  createdAt:              string;
  allocation:             ApplicationAllocation | null;
  documents:              ApplicationDocument[];
}

export interface AvailableRoom {
  id:     string;
  number: string;
  block:  string;
  type:   'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'QUAD' | 'STUDIO';
  price:  string;
  status: 'VACANT' | 'RESERVED';
  capacity:    number;
  occupied:    number;
  vacantSlots: number;
}

export async function getApplicationStatus(): Promise<ApplicationStatus> {
  const res = await api.get<ApiResponse<ApplicationStatus>>('/application/status');
  return res.data.data;
}

export async function getAvailableRooms(): Promise<AvailableRoom[]> {
  const res = await api.get<ApiResponse<AvailableRoom[]>>('/application/rooms');
  return res.data.data;
}

/** Pending student self-reserves a room. Server creates a RESERVED allocation. */
export async function selectRoom(roomId: string): Promise<ApplicationAllocation> {
  const res = await api.post<ApiResponse<ApplicationAllocation>>('/application/select-room', { roomId });
  return res.data.data;
}

export interface ApplicationSubmission {
  idNumber:         string;
  idDocUrl:         string;
  regProofUrl:      string;
  fundingProofUrl:  string;
  signatureDataUrl: string;
}

/** Pending student submits ID + proof of registration + proof of funding + signature. */
export async function submitApplication(payload: ApplicationSubmission): Promise<ApplicationStatus> {
  const res = await api.post<ApiResponse<ApplicationStatus>>('/application/submit', payload);
  return res.data.data;
}

// ── Admin review ──────────────────────────────────────────────

export interface AdminApplicationRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  university: string | null;
  program: string | null;
  year: number | null;
  idNumber: string | null;
  applicationStatus: ApplicationStatusValue;
  applicationSubmittedAt: string | null;
  applicationRejectedAt: string | null;
  applicationAdminNote: string | null;
  createdAt: string;
  documents: ApplicationDocument[];
}

export async function listSubmittedApplications(): Promise<AdminApplicationRow[]> {
  const res = await api.get<ApiResponse<AdminApplicationRow[]>>('/application/admin/list');
  return res.data.data;
}

export async function decideApplication(userId: string, decision: 'APPROVED' | 'REJECTED', note?: string) {
  const res = await api.post<ApiResponse<unknown>>(`/application/admin/${userId}/decide`, { decision, note });
  return res.data.data;
}
