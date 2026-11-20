import { z } from "zod";

const evidenceItemSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), value: z.string().trim().min(1).max(2000) }),
  z.object({ type: z.literal("image"), value: z.string().trim().min(1).max(500) }),
  z.object({ type: z.literal("video"), value: z.string().trim().min(1).max(500) }),
  z.object({ type: z.literal("url"), value: z.string().trim().url().max(2000) }),
]);

export const coachRequestSchema = z.object({
  evidence: z.array(evidenceItemSchema).min(1).max(10),
  note: z.string().trim().max(1000).optional(),
});

export const ownerRequestSchema = z.object({
  note: z.string().trim().max(1000).optional(),
});

export const requestStatusSchema = z.enum(["pending", "approved", "rejected"]);

export const listRequestsSchema = z.object({
  status: requestStatusSchema.default("pending"),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().optional(),
});

export const rejectRequestSchema = z.object({
  reason: z.string().trim().min(1).max(1000),
});

export const requestIdSchema = z.object({
  id: z.string().uuid(),
});

export const requestCursorSchema = z.object({
  created_at: z.string().datetime({ offset: true }),
  id: z.string().uuid(),
});

export type CoachRequestInput = z.infer<typeof coachRequestSchema>;
export type OwnerRequestInput = z.infer<typeof ownerRequestSchema>;
export type RequestStatus = z.infer<typeof requestStatusSchema>;
export type ListRequestsInput = z.infer<typeof listRequestsSchema>;
export type RejectRequestInput = z.infer<typeof rejectRequestSchema>;
