import { z } from 'zod';
import { uuidLike } from '../../common/validators';

export const AssignAdminSchema = z.object({
  user_id: uuidLike('El user_id debe ser un UUID válido'),
});

export type AssignAdminDto = z.infer<typeof AssignAdminSchema>;
