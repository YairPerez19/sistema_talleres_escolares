import { z } from 'zod';

export const LiquidarAdeudoSchema = z.object({
  monto: z.coerce.number().min(0, 'El monto no puede ser negativo').optional(),
  referencia: z
    .string()
    .trim()
    .max(100, 'La referencia no debe exceder 100 caracteres')
    .optional(),
  nota: z
    .string()
    .trim()
    .max(500, 'La nota no debe exceder 500 caracteres')
    .optional(),
});

export type LiquidarAdeudoDto = z.infer<typeof LiquidarAdeudoSchema>;
