import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { forbidden, unauthorized } from "./errors";
import type { Role } from "./roles";

async function authenticate(app: FastifyInstance, req: FastifyRequest) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw unauthorized();
  const token = header.slice(7);

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
  req.user = { id: data.user.id, roles };
}

export function registerAuth(app: FastifyInstance) {
  app.decorate("requireRole", (...roles: Role[]) => {
    return async (req: FastifyRequest, _reply: FastifyReply) => {
      await authenticate(app, req);
      const user = req.user!;
      const allowed =
        roles.length === 0 || roles.includes("user") || roles.some((r) => user.roles.includes(r));
      if (allowed) return;
      if (user.roles.includes("admin")) {
        req.adminBypass = true;
        return;
      }
      throw forbidden();
    };
  });

  app.decorate("requireServiceKey", async (req: FastifyRequest, _reply: FastifyReply) => {
    if (req.headers["x-service-key"] !== app.ctx.env.YOLO_SERVICE_KEY) throw unauthorized();
  });

  // Catat aksi admin yang lolos karena bypass (rules.md bagian 5)
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
