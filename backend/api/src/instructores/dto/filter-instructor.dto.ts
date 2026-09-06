import { z } from 'zod';

export const FilterInstructorSchema = z.object({
  activo: z
    .preprocess((val) => {
      if (val === 'true' || val === true) return true;
      if (val === 'false' || val === false) return false;
      return undefined;
    }, z.boolean().optional())
    .optional(),
  q: z.string().trim().optional(),
});

export type FilterInstructorDto = z.infer<typeof FilterInstructorSchema>;
