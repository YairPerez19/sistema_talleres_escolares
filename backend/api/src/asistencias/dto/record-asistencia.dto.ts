import { z } from 'zod';
import { uuidLike } from '../../common/validators';

export const ESTADOS_ASISTENCIA = [
  'presente',
  'ausente',
  'retardo',
  'justificado',
] as const;

export type EstadoAsistencia = (typeof ESTADOS_ASISTENCIA)[number];

export const RecordAsistenciaSchema = z.object({
  alumno_id: uuidLike('El alumno_id debe ser un UUID válido'),
  taller_id: uuidLike('El taller_id debe ser un UUID válido'),
  fecha: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
  estado: z.enum(ESTADOS_ASISTENCIA, {
    message:
      'El estado debe ser uno de: presente, ausente, retardo, justificado',
  }),
  observaciones: z
    .string()
    .max(500, 'Las observaciones no pueden exceder 500 caracteres')
    .optional(),
});

export type RecordAsistenciaDto = z.infer<typeof RecordAsistenciaSchema>;
