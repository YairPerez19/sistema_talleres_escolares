import { z } from 'zod';
import { CATEGORIAS_TALLER } from '../taller.entity';
import { uuidLike } from '../../common/validators';

export const FilterTallerSchema = z.object({
  categoria: z.enum(CATEGORIAS_TALLER).optional(),
  instructor_id: uuidLike().optional(),
  disponible: z
    .union([z.literal('true'), z.literal('false')])
    .transform((v) => v === 'true')
    .optional(),
  q: z.string().trim().min(1).max(120).optional(),
});

export type FilterTallerDto = z.infer<typeof FilterTallerSchema>;
