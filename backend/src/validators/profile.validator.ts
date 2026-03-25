import { z } from 'zod';

export const updateProfileSchema = z.object({
  name:       z.string().min(2).optional(),
  phone:      z.string().optional(),
  bio:        z.string().max(300).optional(),
  university: z.string().optional(),
  program:    z.string().optional(),
  year:       z.number().int().min(1).max(7).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
