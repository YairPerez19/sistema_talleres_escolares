import { z } from 'zod';

export const UpdateAlumnoSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre no puede estar vacío').optional(),
  turno: z.enum(['matutino', 'vespertino']).optional(),
  cambios_restantes: z.coerce
    .number()
    .int('Debe ser entero')
    .min(0, 'No puede ser negativo')
    .optional(),
  inscripcion_limite: z.string().optional(),
});

export type UpdateAlumnoDto = z.infer<typeof UpdateAlumnoSchema>;
