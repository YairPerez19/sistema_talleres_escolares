import { z } from 'zod';

export const UpdateProfileSchema = z.object({
  nombre: z.string().trim().min(2).max(120).optional(),
  matricula: z.string().trim().max(20).optional(),
  turno: z.enum(['matutino', 'vespertino']).optional(),
});

export type UpdateProfileDto = z.infer<typeof UpdateProfileSchema>;
