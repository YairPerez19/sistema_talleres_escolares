import { z } from 'zod';

export const GenerateDescriptionSchema = z.object({
  nombre: z.string().min(1).max(200),
  categoria: z.string().min(1).max(200),
});

export type GenerateDescriptionDto = z.infer<typeof GenerateDescriptionSchema>;
