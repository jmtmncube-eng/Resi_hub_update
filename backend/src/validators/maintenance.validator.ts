import { z } from 'zod';

export const createTicketSchema = z.object({
  category:    z.enum(['WiFi / Internet','Plumbing','Electrical','Furniture','Appliance','Structural','Pest Control','Cleaning','Security','Other']),
  location:    z.string().min(2, 'Location is required'),
  description: z.string().min(10, 'Please describe the issue in more detail'),
  priority:    z.enum(['LOW','NORMAL','HIGH','EMERGENCY']).default('NORMAL'),
});

export const updateTicketSchema = z.object({
  status:    z.enum(['OPEN','IN_PROGRESS','RESOLVED','CLOSED']).optional(),
  adminNote: z.string().optional(),
  priority:  z.enum(['LOW','NORMAL','HIGH','EMERGENCY']).optional(),
});

export type CreateTicketInput  = z.infer<typeof createTicketSchema>;
export type UpdateTicketInput  = z.infer<typeof updateTicketSchema>;
