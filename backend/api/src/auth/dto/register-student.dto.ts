import { z } from 'zod';

export const RegisterStudentSchema = z.object({
  nombre: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  matricula: z.string().min(4, 'Matrícula inválida'),
  turno: z.enum(['matutino', 'vespertino'], {
    message: 'Selecciona un turno válido',
  }),
});

export type RegisterStudentDto = z.infer<typeof RegisterStudentSchema>;
