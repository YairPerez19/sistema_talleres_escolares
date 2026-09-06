import { z } from 'zod';

export const FilterAdeudosSchema = z.object({
  con_deuda_only: z
    .preprocess((val) => {
      if (typeof val === 'string') {
        if (val.toLowerCase() === 'true' || val === '1') return true;
        if (val.toLowerCase() === 'false' || val === '0') return false;
      }
      return val;
    }, z.boolean().optional())
    .optional(),
  q: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type FilterAdeudosDto = z.infer<typeof FilterAdeudosSchema>;
