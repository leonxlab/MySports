import type { FastifyReply, FastifyRequest } from "fastify";

export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export const unauthorized = (msg = "Login dulu") => new AppError(401, "UNAUTHORIZED", msg);
export const forbidden = (msg = "Role kamu tidak boleh melakukan ini") =>
  new AppError(403, "FORBIDDEN", msg);
export const notFound = (code: string, msg: string) => new AppError(404, code, msg);

/** Handler sementara untuk endpoint yang belum dikerjakan. Hapus saat diimplementasi. */
export const todo = (summary: string) => async (_req: FastifyRequest, reply: FastifyReply) =>
  reply.code(501).send({ error: { code: "NOT_IMPLEMENTED", message: `TODO: ${summary}` } });
