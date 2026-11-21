import type { FastifyInstance } from "fastify";
import { defineModule } from "../../core/module";
import { registerOtpRoutes } from "./service";

export default defineModule({ name: "auth-otp", phase: 1, register: registerOtpRoutes });
