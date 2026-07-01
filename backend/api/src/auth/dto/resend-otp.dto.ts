import { z } from 'zod';

export const ResendOtpSchema = z.object({
  pending_token: z.string().min(1),
});

export type ResendOtpDto = z.infer<typeof ResendOtpSchema>;
