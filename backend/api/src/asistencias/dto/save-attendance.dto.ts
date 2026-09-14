import { z } from 'zod';
import { uuidLike } from '../../common/validators';

export const SaveAttendanceSchema = z.object({
  alumno_id: uuidLike(),
  taller_id: uuidLike(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  estado: z.enum(['presente', 'ausente', 'retardo', 'justificado']),
  observaciones: z.string().trim().max(500).optional(),
});

export type SaveAttendanceDto = z.infer<typeof SaveAttendanceSchema>;
