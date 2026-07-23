import { z } from 'zod';
import { CATEGORIAS_TALLER } from '../taller.entity';
import { HorarioSchema } from './horario.dto';

// Todos los campos opcionales;提供服务 parcial.
export const UpdateTallerSchema = z
  .object({
    nombre: z.string().trim().min(2).max(120).optional(),
    categoria: z.enum(CATEGORIAS_TALLER).optional(),
    lugar: z.string().trim().min(1).max(120).optional(),
    instructor: z.string().trim().min(2).max(120).optional(),
    instructor_id: z.string().uuid().nullable().optional(),
    descripcion: z.string().trim().max(2000).nullable().optional(),
    cupo: z.number().int().min(1).max(500).optional(),
    imagen_url: z.string().url().nullable().optional(),
    // Reemplazo completo de horarios si se envía; [] para limpiar.
    horarios: z.array(HorarioSchema).max(20).optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'Debes enviar al menos un campo para actualizar.',
  });

export type UpdateTallerDto = z.infer<typeof UpdateTallerSchema>;
