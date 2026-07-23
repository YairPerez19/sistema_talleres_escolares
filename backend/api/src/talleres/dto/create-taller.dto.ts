import { z } from 'zod';
import { CATEGORIAS_TALLER } from '../taller.entity';
import { HorarioSchema } from './horario.dto';

export const CreateTallerSchema = z.object({
  nombre: z.string().trim().min(2).max(120),
  categoria: z.enum(CATEGORIAS_TALLER),
  lugar: z.string().trim().min(1).max(120),
  instructor: z.string().trim().min(2).max(120),
  instructor_id: z.string().uuid().nullable().optional(),
  descripcion: z.string().trim().max(2000).nullable().optional(),
  cupo: z.number().int().min(1).max(500).default(30),
  imagen_url: z.string().url().nullable().optional(),
  horarios: z.array(HorarioSchema).max(20).optional(),
});

export type CreateTallerDto = z.infer<typeof CreateTallerSchema>;
