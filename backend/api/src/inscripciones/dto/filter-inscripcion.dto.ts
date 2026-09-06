import { z } from 'zod';
import { uuidLike } from '../../common/validators';

export const FilterInscripcionSchema = z.object({
  taller_id: uuidLike('El taller_id debe ser un UUID válido').optional(),
  alumno_id: uuidLike('El alumno_id debe ser un UUID válido').optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type FilterInscripcionDto = z.infer<typeof FilterInscripcionSchema>;
