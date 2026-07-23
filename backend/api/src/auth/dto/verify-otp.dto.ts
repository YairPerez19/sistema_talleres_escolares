import { z } from 'zod';

export const VerifyOtpSchema = z.object({
  pending_token: z.string().min(1),
  code: z
    .string()
    .length(6)
    .regex(/^\d{6}$/),
});

export type VerifyOtpDto = z.infer<typeof VerifyOtpSchema>;
