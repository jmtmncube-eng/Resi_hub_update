import api from './api';
import { LoginInput, LoginResponse, RegisterInput, User } from '../types/auth.types';
import { ApiResponse } from '../types/api.types';

export async function login(data: LoginInput): Promise<LoginResponse> {
  const res = await api.post<ApiResponse<LoginResponse>>('/auth/login', data);
  return res.data.data;
}

export async function register(data: RegisterInput): Promise<LoginResponse> {
  const res = await api.post<ApiResponse<LoginResponse>>('/auth/register', data);
  return res.data.data;
}

export async function getMe(): Promise<User> {
  const res = await api.get<ApiResponse<User>>('/auth/me');
  return res.data.data;
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}
