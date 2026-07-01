import { z } from 'zod';

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
    taller_id: z.string().uuid(),
  }),
  z.object({
    role: z.literal('admin'),
    email: z.string().email(),
    password: z.string().min(6),
  }),
]);

export type VerifyIdentityDto = z.infer<typeof VerifyIdentitySchema>;
