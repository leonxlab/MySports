import type { SupabaseClient } from "@supabase/supabase-js";
import type { Env } from "../config/env";
import type { RealtimeHub } from "./realtime";

/** Dependensi yang dipakai semua modul. Dibuat sekali di server.ts. */
export interface AppContext {
  env: Env;
  supabase: SupabaseClient;
  realtime: RealtimeHub;
}
