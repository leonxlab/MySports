"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase";

export function LoginPage({ mode = "login" }: { mode?: "login" | "signup" }) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleGoogleLogin() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const { error } = await getSupabase().auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Tidak dapat memulai login dengan Google. Silakan coba lagi.",
      );
      setIsLoading(false);
    }
  }

  return (
    <main
      style={{
        alignItems: "center",
        background: "#f8fafc",
        display: "flex",
        justifyContent: "center",
        minHeight: "100vh",
        padding: 24,
      }}
    >
      <section
        aria-labelledby="login-title"
        style={{
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 16,
          boxShadow: "0 12px 32px rgb(15 23 42 / 8%)",
          maxWidth: 420,
          padding: 32,
          textAlign: "center",
          width: "100%",
        }}
      >
        <h1 id="login-title" style={{ color: "#0f172a", margin: "0 0 8px" }}>
          {mode === "signup" ? "Daftar ke Open Play" : "Masuk ke Open Play"}
        </h1>
        <p style={{ color: "#475569", margin: "0 0 24px" }}>
          Gunakan akun Google {mode === "signup" ? "untuk membuat akun atau" : "untuk"} melanjutkan.
        </p>
        <button
          disabled={isLoading}
          onClick={handleGoogleLogin}
          style={{
            alignItems: "center",
            background: "#fff",
            border: "1px solid #cbd5e1",
            borderRadius: 8,
            color: "#0f172a",
            cursor: isLoading ? "wait" : "pointer",
            display: "flex",
            font: "inherit",
            fontWeight: 600,
            gap: 12,
            justifyContent: "center",
            minHeight: 48,
            opacity: isLoading ? 0.7 : 1,
            width: "100%",
          }}
          type="button"
        >
          <svg aria-hidden="true" height="20" viewBox="0 0 48 48" width="20">
            <path
              d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15Z"
              fill="#4285F4"
            />
            <path
              d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.6-5.1c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.2A20 20 0 0 0 24 44Z"
              fill="#34A853"
            />
            <path
              d="M12.6 27.7a12 12 0 0 1 0-7.4v-5.2H5.8a20 20 0 0 0 0 17.8l6.8-5.2Z"
              fill="#FBBC05"
            />
            <path
              d="M24 11.9c3 0 5.7 1 7.8 3.1l5.8-5.8A19.4 19.4 0 0 0 24 4 20 20 0 0 0 5.8 15.1l6.8 5.2c1.6-4.8 6.1-8.4 11.4-8.4Z"
              fill="#EA4335"
            />
          </svg>
          {isLoading
            ? "Menghubungkan ke Google..."
            : mode === "signup"
            ? "Daftar dengan Google"
            : "Lanjutkan dengan Google"}
        </button>
        {errorMessage ? (
          <p aria-live="polite" role="alert" style={{ color: "#b91c1c", margin: "16px 0 0" }}>
            Login gagal: {errorMessage}
          </p>
        ) : null}
      </section>
    </main>
  );
}
