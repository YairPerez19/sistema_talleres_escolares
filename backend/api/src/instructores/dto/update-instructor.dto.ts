import { z } from 'zod';
import { uuidLike } from '../../common/validators';

export const UpdateInstructorSchema = z.object({
  especialidad: z.string().trim().optional(),
  telefono: z.string().trim().optional(),
  activo: z.boolean().optional(),
  taller_id: uuidLike('ID de taller inválido').nullable().optional(),
});

export type UpdateInstructorDto = z.infer<typeof UpdateInstructorSchema>;
