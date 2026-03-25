import api from './api';
import { ApiResponse } from '../types/api.types';

export interface Housemate {
  id:         string;
  name:       string;
  avatarUrl?: string;
  university?: string;
  program?:   string;
  year?:      number;
  bio?:       string;
  room: { number: string; block: string; type: string };
}

export interface HousematesResponse {
  block:      string;
  housemates: Housemate[];
}

export async function getHousemates(): Promise<HousematesResponse> {
  const res = await api.get<ApiResponse<HousematesResponse>>('/housemates');
  return res.data.data;
}
