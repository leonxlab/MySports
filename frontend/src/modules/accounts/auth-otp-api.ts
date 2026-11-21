import { apiClient } from "@/lib/api-client";
import { getSupabase } from "@/lib/supabase";

export type OtpPurpose = "signup" | "login";

export interface OtpRequestResult {
  sent: boolean;
}

export interface OtpVerifyResult {
  created: boolean;
  redirect_url: string;
}

/** Satu-satunya pintu ke modul auth-otp di backend. */
export const authOtpApi = {
  request: (email: string, purpose: OtpPurpose) =>
    apiClient.request<OtpRequestResult>("POST", "/auth-otp/request", {
      body: { email, purpose },
    }),
  verify: (email: string, purpose: OtpPurpose, code: string) =>
    apiClient.request<OtpVerifyResult>("POST", "/auth-otp/verify", {
      body: { email, purpose, code },
    }),
};

/**
 * Tukar token hash magic link Supabase menjadi sesi di klien.
 * Dipakai setelah verify login sukses (redirect_url berisi token_hash).
 */
export async function exchangeSession(tokenHash: string) {
  const { error } = await getSupabase().auth.verifyOtp({
    type: "magiclink",
    token_hash: tokenHash,
  });
  if (error) throw error;
}
