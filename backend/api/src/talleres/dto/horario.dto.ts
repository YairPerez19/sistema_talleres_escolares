import { z } from 'zod';
import { DIAS_SEMANA } from '../taller.entity';

const horaRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export const HorarioSchema = z
  .object({
    dia: z.enum(DIAS_SEMANA),
    hora_inicio: z.string().regex(horaRegex, 'Formato HH:MM requerido'),
    hora_fin: z.string().regex(horaRegex, 'Formato HH:MM requerido'),
  })
  .refine((h) => h.hora_inicio < h.hora_fin, {
    message: 'hora_inicio debe ser menor que hora_fin',
    path: ['hora_fin'],
  });

export type HorarioInput = z.infer<typeof HorarioSchema>;
