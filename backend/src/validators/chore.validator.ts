import { z } from 'zod';

export const choreActionSchema = z.object({
  note: z.string().optional(),
});

export type ChoreActionInput = z.infer<typeof choreActionSchema>;
