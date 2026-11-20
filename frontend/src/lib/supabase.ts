import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

// Hanya untuk Supabase Auth dan upload ke Storage lewat signed URL.
// Data aplikasi selalu lewat backend (rules.md bagian 2).
let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) client = createClient(env.supabaseUrl, env.supabaseAnonKey);
  return client;
}

export async function getAccessToken(): Promise<string | null> {
  const { data } = await getSupabase().auth.getSession();
  return data.session?.access_token ?? null;
}
