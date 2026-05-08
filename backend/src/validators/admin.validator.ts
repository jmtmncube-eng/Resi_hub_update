import { z } from 'zod';

export const createAllocationSchema = z.object({
  userId:    z.string().min(1),
  roomId:    z.string().min(1),
  rent:      z.number().positive(),
  startDate: z.string().optional(),
  status:    z.enum(['ACTIVE', 'RESERVED']).optional(),
  /** True = tenant tops up their own electricity meter; false (default) = admin handles bulk. */
  electricitySelfManaged: z.boolean().optional(),
});

export const updateAllocationSchema = z.object({
  rent:   z.number().positive().optional(),
  status: z.enum(['ACTIVE', 'RESERVED', 'ENDED']).optional(),
  electricitySelfManaged: z.boolean().optional(),
});

export const updateAccountSchema = z.object({
  name:       z.string().min(2).optional(),
  email:      z.string().email().optional(),
  role:       z.enum(['ACTIVE_STUDENT', 'PENDING_STUDENT', 'ADMIN']).optional(),
  phone:      z.string().optional().or(z.literal('')),
  university: z.string().optional().or(z.literal('')),
  program:    z.string().optional().or(z.literal('')),
  year:       z.number().int().min(1).max(10).optional().nullable(),
  bio:        z.string().max(500).optional().or(z.literal('')),
});

export const createVoucherSchema = z.object({
  name:          z.string().min(2),
  description:   z.string().min(5),
  cost:          z.number().int().positive(),
  stock:         z.number().int().min(0),
  icon:          z.string().default('🎁'),
  requiresProof: z.boolean().optional(),
  taskTitle:     z.string().optional(),
  pin:           z.string().optional(),
  imageUrl:      z.string().optional(),
});

export const updateVoucherSchema = z.object({
  name:          z.string().min(2).optional(),
  description:   z.string().min(5).optional(),
  cost:          z.number().int().positive().optional(),
  stock:         z.number().int().min(0).optional(),
  icon:          z.string().optional(),
  isActive:      z.boolean().optional(),
  requiresProof: z.boolean().optional(),
  taskTitle:     z.string().optional(),
  pin:           z.string().optional(),
  imageUrl:      z.string().optional(),
});

export const awardCreditsSchema = z.object({
  userId: z.string().uuid(),
  amount: z.number().int(),
  note:   z.string().min(2),
});

export type CreateAllocationInput = z.infer<typeof createAllocationSchema>;
export type UpdateAllocationInput = z.infer<typeof updateAllocationSchema>;
export type UpdateAccountInput    = z.infer<typeof updateAccountSchema>;
export type CreateVoucherInput    = z.infer<typeof createVoucherSchema>;
export type UpdateVoucherInput    = z.infer<typeof updateVoucherSchema>;
export type AwardCreditsInput     = z.infer<typeof awardCreditsSchema>;
