import { z } from 'zod';

export const FilterAlumnoSchema = z.object({
  q: z.string().trim().optional(),
  turno: z.enum(['matutino', 'vespertino']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type FilterAlumnoDto = z.infer<typeof FilterAlumnoSchema>;
