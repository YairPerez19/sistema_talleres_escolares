import { z } from 'zod';
import { uuidLike } from '../../common/validators';

export const CreateInscripcionSchema = z.object({
  taller_id: uuidLike('El taller_id debe ser un UUID válido'),
  alumno_id: uuidLike('El alumno_id debe ser un UUID válido').optional(),
});

export type CreateInscripcionDto = z.infer<typeof CreateInscripcionSchema>;
