import { z } from 'zod';

// El admin crea la cuenta del instructor y la asigna a un taller en la misma operación.
// El instructor no se auto-registra: no hay flujo público equivalente a register-student.
export const RegisterInstructorSchema = z.object({
  nombre: z.string().trim().min(3, 'El nombre debe tener al menos 3 caracteres'),
  email: z.string().trim().email('Correo electrónico inválido'),
  password: z
    .string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres')
    .max(72, 'La contraseña no puede superar 72 caracteres'),
  matricula: z.string().trim().min(4, 'Matrícula inválida'),
  taller_id: z.string().uuid('Taller inválido'),
});

export type RegisterInstructorDto = z.infer<typeof RegisterInstructorSchema>;
