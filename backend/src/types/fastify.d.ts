import "fastify";
import type { AppContext } from "../core/context";
import type { AuthUser, Role } from "../core/roles";

declare module "fastify" {
  interface FastifyInstance {
    ctx: AppContext;
    /** Wajib login. Tanpa argumen = semua yang login. Admin selalu lolos. */
    requireRole: (...roles: Role[]) => (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /** Untuk endpoint yang dipanggil yolo-service (header x-service-key). */
    requireServiceKey: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    user?: AuthUser;
    /** true bila admin memakai endpoint berrole (bypass atau khusus admin). Dicatat ke admin_audit_log. */
    adminBypass?: boolean;
  }
}
