import { z } from 'zod';

export const createVisitorSchema = z.object({
  visitorName:  z.string().min(2, 'Visitor name is required'),
  visitorPhone: z.string().min(7, 'Phone number is required'),
  date:         z.string().min(1, 'Date is required'),
  timeFrom:     z.string().min(1, 'Start time is required'),
  timeTo:       z.string().min(1, 'End time is required'),
  purpose:      z.string().min(2, 'Purpose is required'),
});

export type CreateVisitorInput = z.infer<typeof createVisitorSchema>;
