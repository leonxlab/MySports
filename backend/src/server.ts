import { createClient } from "@supabase/supabase-js";
import { buildApp } from "./app";
import { loadEnv } from "./config/env";
import { RealtimeHub } from "./core/realtime";

async function main() {
  const env = loadEnv();
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const app = await buildApp({ env, supabase, realtime: new RealtimeHub() });
  await app.listen({ port: env.PORT, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
