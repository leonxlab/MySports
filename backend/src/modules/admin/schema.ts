import { z } from "zod";

const dateSchema = z.string().date();

export const auditCursorSchema = z.object({
  created_at: z.string().datetime({ offset: true }),
  id: z.string().regex(/^\d+$/),
});

export const listAuditSchema = z
  .object({
    admin_id: z.string().uuid().optional(),
    from: dateSchema.optional(),
    to: dateSchema.optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    cursor: z.string().optional(),
  })
  .refine((input) => !input.from || !input.to || input.from <= input.to, {
    message: "Tanggal awal tidak boleh melebihi tanggal akhir",
    path: ["to"],
  });

export type ListAuditInput = z.infer<typeof listAuditSchema>;
