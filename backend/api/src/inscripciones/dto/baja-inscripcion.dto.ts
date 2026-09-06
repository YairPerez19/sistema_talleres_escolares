import { z } from 'zod';
import { uuidLike } from '../../common/validators';

export const BajaInscripcionSchema = z.object({
  taller_id: uuidLike('El taller_id debe ser un UUID válido'),
  alumno_id: uuidLike('El alumno_id debe ser un UUID válido').optional(),
  motivo: z
    .string()
    .trim()
    .max(500, 'El motivo no puede exceder 500 caracteres')
    .optional(),
});

export type BajaInscripcionDto = z.infer<typeof BajaInscripcionSchema>;
