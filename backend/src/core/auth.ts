import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { forbidden, unauthorized } from "./errors";
import { type AuthUser, evaluateAccess, type Role } from "./roles";

async function authenticate(app: FastifyInstance, req: FastifyRequest) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw unauthorized();
  req.user = await resolveUser(app, header.slice(7));
}

/**
 * Verifikasi token Supabase dan ambil role user. Dipakai HTTP (header Authorization)
 * dan WebSocket (query ?token=, lihat core/realtime.ts).
 */
export async function resolveUser(app: FastifyInstance, token: string | undefined): Promise<AuthUser> {
  if (!token) throw unauthorized();

  const { data, error } = await app.ctx.supabase.auth.getUser(token);
  if (error || !data.user) throw unauthorized("Token tidak valid");

  const { data: rows, error: roleError } = await app.ctx.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id);
  if (roleError) throw roleError;

  const roles = (rows ?? []).map((r) => r.role as Role);
  // akun yang baru signup dan belum bootstrap tetap dianggap "user"
  if (!roles.includes("user")) roles.push("user");
  return { id: data.user.id, roles };
}

export function registerAuth(app: FastifyInstance) {
  app.decorate("requireRole", (...roles: Role[]) => {
    return async (req: FastifyRequest, _reply: FastifyReply) => {
      await authenticate(app, req);
      const { allowed, audit } = evaluateAccess(req.user!.roles, roles);
      if (audit) req.adminBypass = true;
      if (!allowed) throw forbidden();
    };
  });

  app.decorate("requireServiceKey", async (req: FastifyRequest, _reply: FastifyReply) => {
    if (req.headers["x-service-key"] !== app.ctx.env.YOLO_SERVICE_KEY) throw unauthorized();
  });

  // Catat aksi admin pada endpoint berrole (rules.md bagian 5)
  app.addHook("onResponse", async (req, reply) => {
    if (!req.adminBypass || reply.statusCode >= 400 || req.method === "GET") return;
    const { error } = await app.ctx.supabase.from("admin_audit_log").insert({
      admin_id: req.user!.id,
      method: req.method,
      path: req.url,
      target: { params: req.params ?? null },
    });
    if (error) req.log.error({ error }, "gagal menulis audit log");
  });
}
