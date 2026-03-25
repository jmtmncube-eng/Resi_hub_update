import { z } from 'zod';

export const createNewsSchema = z.object({
  title:    z.string().min(3, 'Title is required'),
  body:     z.string().min(10, 'Body is required'),
  type:     z.string().min(1, 'Type is required'),
  tag:      z.string().min(1, 'Tag is required'),
  tagColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex colour').optional(),
  pinned:   z.boolean().default(false),
  date:     z.string().min(1, 'Date label is required'),
});

export type CreateNewsInput = z.infer<typeof createNewsSchema>;
