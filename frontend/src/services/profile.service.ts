import api from './api';
import { ApiResponse } from '../types/api.types';
import { User } from '../types/auth.types';

export interface UpdateProfileInput {
  name?:       string;
  phone?:      string;
  bio?:        string;
  university?: string;
  program?:    string;
  year?:       number;
}

export async function getProfile(): Promise<User> {
  const res = await api.get<ApiResponse<User>>('/profile');
  return res.data.data;
}

export async function updateProfile(data: UpdateProfileInput): Promise<User> {
  const res = await api.patch<ApiResponse<User>>('/profile', data);
  return res.data.data;
}

export async function uploadAvatar(file: File): Promise<User> {
  const form = new FormData();
  form.append('avatar', file);
  const res = await api.post<ApiResponse<User>>('/profile/avatar', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data;
}
