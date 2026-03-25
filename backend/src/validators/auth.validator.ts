import { z } from 'zod';

export const loginSchema = z.object({
  email:    z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  name:       z.string().min(2, 'Name must be at least 2 characters'),
  email:      z.string().email('Invalid email address'),
  password:   z.string().min(6, 'Password must be at least 6 characters'),
  university: z.string().optional(),
  program:    z.string().optional(),
  year:       z.number().int().min(1).max(7).optional(),
  phone:      z.string().optional(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type LoginInput    = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type RefreshInput  = z.infer<typeof refreshSchema>;
