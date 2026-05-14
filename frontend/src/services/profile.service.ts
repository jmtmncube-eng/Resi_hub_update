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

export async function completeOnboarding(): Promise<{ onboardedAt: string }> {
  const res = await api.post<ApiResponse<{ onboardedAt: string }>>('/profile/onboarding');
  return res.data.data;
}

export async function uploadAvatar(file: File): Promise<User> {
  const form = new FormData();
  form.append('avatar', file);
  // Do NOT set Content-Type manually — axios auto-sets it WITH the multipart
  // boundary when the body is FormData. Hard-coding 'multipart/form-data'
  // drops the boundary and the server can't parse the upload.
  const res = await api.post<ApiResponse<User>>('/profile/avatar', form);
  return res.data.data;
}
