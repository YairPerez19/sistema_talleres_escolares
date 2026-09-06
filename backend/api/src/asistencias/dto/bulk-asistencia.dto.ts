import { z } from 'zod';
import { uuidLike } from '../../common/validators';
import { ESTADOS_ASISTENCIA } from './record-asistencia.dto';

export const BulkAsistenciaSchema = z.object({
  taller_id: uuidLike('El taller_id debe ser un UUID válido'),
  fecha: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
  estado: z.enum(ESTADOS_ASISTENCIA, {
    message:
      'El estado debe ser uno de: presente, ausente, retardo, justificado',
  }),
  alumno_ids: z
    .array(uuidLike('Cada elemento de alumno_ids debe ser un UUID válido'))
    .optional(),
});

export type BulkAsistenciaDto = z.infer<typeof BulkAsistenciaSchema>;
