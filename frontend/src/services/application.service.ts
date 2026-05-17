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
  expiresAt: string | null;
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

// ── Compliance docs (re-upload) ────────────────────────────────

export type MyDocsByType = Record<ApplicationDocType, ApplicationDocument | null>;

/** Returns the user's 4 application docs grouped by type — null for any missing. */
export async function getMyApplicationDocs(): Promise<MyDocsByType> {
  const res = await api.get<ApiResponse<MyDocsByType>>('/application/my-docs');
  return res.data.data;
}

/** Upsert a single application doc (admin / student) — replaces prior version of that type. */
export async function uploadApplicationDoc(type: ApplicationDocType, fileUrl: string): Promise<ApplicationDocument> {
  const res = await api.post<ApiResponse<ApplicationDocument>>('/application/upload-doc', { type, fileUrl });
  return res.data.data;
}

/** Admin / manager: set or clear a compliance document's expiry date.
 *  `expiresAt` as null clears it. */
export async function setDocExpiry(docId: string, expiresAt: string | null): Promise<ApplicationDocument> {
  const res = await api.patch<ApiResponse<ApplicationDocument>>(
    `/application/admin/docs/${docId}/expiry`, { expiresAt },
  );
  return res.data.data;
}

// ── Admin: per-doc compliance review ───────────────────────────

export interface PendingDocReview {
  id:        string;
  type:      ApplicationDocType;
  status:    string;
  fileUrl:   string | null;
  createdAt: string;
  user:      { id: string; name: string; email: string; role: string };
}

/** Admin / manager: list every compliance doc currently awaiting review
 *  (Submitted status), across both pending applicants and active students
 *  who re-uploaded — sorted oldest-first so the queue is FIFO. */
export async function listDocsAwaitingReview(): Promise<PendingDocReview[]> {
  const res = await api.get<ApiResponse<PendingDocReview[]>>('/application/admin/docs/awaiting-review');
  return res.data.data;
}

/** Admin / manager: nudge a student to upload one or more missing
 *  compliance documents. Sends a single in-app notification + email
 *  listing every type. Backend skips any types already uploaded. */
export async function remindCompliance(userId: string, types: ApplicationDocType[]): Promise<{ remindedTypes: ApplicationDocType[] }> {
  const res = await api.post<ApiResponse<{ remindedTypes: ApplicationDocType[] }>>(
    `/application/admin/${userId}/remind-docs`, { types },
  );
  return res.data.data;
}

/** Admin / manager: per-doc verdict. Rejection requires a note — the
 *  student gets an in-app notification + email with the reason and
 *  a deep-link back to /profile to re-upload. */
export async function decideDocument(
  docId: string,
  decision: 'APPROVED' | 'REJECTED',
  note?: string,
): Promise<ApplicationDocument> {
  const res = await api.post<ApiResponse<ApplicationDocument>>(
    `/application/admin/docs/${docId}/decide`, { decision, note },
  );
  return res.data.data;
}
