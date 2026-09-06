import { z } from 'zod';
import { uuidLike } from '../../common/validators';
import { ESTADOS_ASISTENCIA } from './record-asistencia.dto';

export const FilterAsistenciaSchema = z.object({
  fecha: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)')
    .optional(),
  taller_id: uuidLike('El taller_id debe ser un UUID válido').optional(),
  estado: z.enum(ESTADOS_ASISTENCIA).optional(),
  alumno_id: uuidLike('El alumno_id debe ser un UUID válido').optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type FilterAsistenciaDto = z.infer<typeof FilterAsistenciaSchema>;
