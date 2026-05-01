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

export interface ApplicationStatus {
  id:         string;
  name:       string;
  email:      string;
  role:       string;
  university: string | null;
  program:    string | null;
  year:       number | null;
  createdAt:  string;
  allocation: ApplicationAllocation | null;
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
