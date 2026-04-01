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
  type:   'SINGLE' | 'DOUBLE' | 'STUDIO';
  price:  string;
  status: 'VACANT';
}

export async function getApplicationStatus(): Promise<ApplicationStatus> {
  const res = await api.get<ApiResponse<ApplicationStatus>>('/application/status');
  return res.data.data;
}

export async function getAvailableRooms(): Promise<AvailableRoom[]> {
  const res = await api.get<ApiResponse<AvailableRoom[]>>('/application/rooms');
  return res.data.data;
}
