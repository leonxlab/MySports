import { createClient } from "@supabase/supabase-js";
import { buildApp } from "../src/app";
import type { Env } from "../src/config/env";
import { RealtimeHub } from "../src/core/realtime";

export const testEnv: Env = {
  NODE_ENV: "test",
  PORT: 0,
  CORS_ORIGINS: "http://localhost:3000",
  SUPABASE_URL: "http://127.0.0.1:54321",
  SUPABASE_SERVICE_ROLE_KEY: "test-key",
  YOLO_SERVICE_KEY: "test-service-key-1234567890",
  PAYMENT_PROVIDER: "undecided",
  PAYMENT_WEBHOOK_SECRET: "",
};

export async function testApp() {
  const supabase = createClient(testEnv.SUPABASE_URL, testEnv.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  return buildApp({ env: testEnv, supabase, realtime: new RealtimeHub() });
}
