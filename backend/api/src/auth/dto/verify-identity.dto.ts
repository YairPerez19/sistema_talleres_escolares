import { z } from 'zod';
import { uuidLike } from '../../common/validators';

export const VerifyIdentitySchema = z.discriminatedUnion('role', [
  z.object({
    role: z.literal('student'),
    email: z.string().email(),
    password: z.string().min(6),
    matricula: z.string().min(1),
  }),
  z.object({
    role: z.literal('instructor'),
    email: z.string().email(),
    password: z.string().min(6),
    matricula: z.string().min(1),
    taller_id: uuidLike('Taller inválido'),
  }),
  z.object({
    role: z.literal('admin'),
    email: z.string().email(),
    password: z.string().min(6),
  }),
]);

export type VerifyIdentityDto = z.infer<typeof VerifyIdentitySchema>;
