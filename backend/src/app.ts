import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import Fastify from "fastify";
import { ZodError } from "zod";
import { registerAuth } from "./core/auth";
import type { AppContext } from "./core/context";
import { AppError } from "./core/errors";
import { modules } from "./modules";

export async function buildApp(ctx: AppContext) {
  const app = Fastify({ logger: ctx.env.NODE_ENV !== "test" });

  app.decorate("ctx", ctx);
  await app.register(cors, { origin: ctx.env.CORS_ORIGINS.split(",").map((s) => s.trim()) });
  await app.register(websocket);
  registerAuth(app);

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof AppError) {
      return reply.code(err.status).send({ error: { code: err.code, message: err.message } });
    }
    if (err instanceof ZodError) {
      return reply
        .code(400)
        .send({ error: { code: "VALIDATION_ERROR", message: "Input tidak valid", details: err.issues } });
    }
    app.log.error(err);
    return reply.code(500).send({ error: { code: "INTERNAL", message: "Terjadi kesalahan server" } });
  });

  app.get("/health", async () => ({ status: "ok" }));

  for (const mod of modules) {
    await app.register(async (scope) => mod.register(scope), { prefix: `/api/v1/${mod.name}` });
  }

  return app;
}
