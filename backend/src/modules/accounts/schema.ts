import { z } from "zod";

export const bootstrapProfileSchema = z.object({
  display_name: z.string().trim().min(1).max(80),
});

export type BootstrapProfileInput = z.infer<typeof bootstrapProfileSchema>;
