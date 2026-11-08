import type { FastifyInstance } from "fastify";

export interface AppModule {
  /** Nama modul = prefix URL: /api/v1/<name> */
  name: string;
  /** Fase proposal (1-4). Hanya informasi, lihat MODULES.md */
  phase: 1 | 2 | 3 | 4;
  register: (app: FastifyInstance) => Promise<void> | void;
}

export const defineModule = (m: AppModule) => m;
