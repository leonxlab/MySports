"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authOtpApi, exchangeSession } from "../auth-otp-api";
import type { OtpPurpose } from "../auth-otp-api";

/**
 * Form OTP email dua langkah: minta kode → verifikasi.
 * Dipakai halaman /login (purpose login) dan /register (purpose signup).
 * Login dengan Google tetap tersedia sebagai tombol terpisah.
 */
export function OtpForm({ purpose }: { purpose: OtpPurpose }) {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  const isSignup = purpose === "signup";
  const heading = isSignup ? "Daftar ke Peluit" : "Masuk ke Peluit";

  async function requestCode() {
    setIsLoading(true);
    setErrorMessage("");
    setInfoMessage("");
    try {
      await authOtpApi.request(email, purpose);
      setInfoMessage(`Kode dikirim ke ${email}. Cek folder spam bila tidak ada.`);
      setStep("code");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Gagal meminta kode. Coba lagi.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function verifyCode() {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const result = await authOtpApi.verify(email, purpose, code);
      if (isSignup) {
        // Akun dibuat; lanjut ke login OTP agar mendapat sesi.
        setInfoMessage("Akun dibuat. Silakan login dengan kode baru.");
        router.push("/login");
        return;
      }
      // login: tukar token hash magic link menjadi sesi
      const tokenHash = new URLSearchParams(result.redirect_url.split("?")[1] ?? "").get(
        "token_hash",
      );
      if (!tokenHash) {
        setErrorMessage("Gagal membuat sesi. Coba lagi.");
        return;
      }
      await exchangeSession(tokenHash);
      router.push("/");
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Verifikasi gagal. Coba lagi.");
    } finally {
      setIsLoading(false);
    }
  }

  const inputStyle = {
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    font: "inherit",
    minHeight: 48,
    padding: "0 12px",
    width: "100%",
    boxSizing: "border-box" as const,
  };

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
        aria-labelledby="otp-title"
        style={{
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 16,
          boxShadow: "0 12px 32px rgb(15 23 42 / 8%)",
          maxWidth: 420,
          padding: 32,
          width: "100%",
        }}
      >
        <h1 id="otp-title" style={{ color: "#0f172a", margin: "0 0 8px" }}>
          {heading}
        </h1>
        <p style={{ color: "#475569", margin: "0 0 24px" }}>
          {step === "email"
            ? `Masukkan email kamu${isSignup ? " untuk mendaftar" : " untuk menerima kode masuk"}.`
            : `Kode dikirim ke ${email}. Berlaku 5 menit.`}
        </p>

        {step === "email" ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!isLoading) void requestCode();
            }}
            style={{ display: "grid", gap: 12 }}
          >
            <label htmlFor="otp-email" style={{ color: "#0f172a", fontWeight: 600 }}>
              Email
            </label>
            <input
              autoComplete="email"
              disabled={isLoading}
              id="otp-email"
              inputMode="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nama@email.com"
              required
              style={inputStyle}
              type="email"
              value={email}
            />
            <button
              disabled={isLoading || !email.trim()}
              style={{
                background: "var(--color-primary)",
                border: "none",
                borderRadius: 8,
                color: "#fff",
                cursor: isLoading ? "wait" : "pointer",
                font: "inherit",
                fontWeight: 600,
                minHeight: 48,
                opacity: isLoading ? 0.7 : 1,
              }}
              type="submit"
            >
              {isLoading ? "Mengirim kode..." : "Kirim kode"}
            </button>
          </form>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!isLoading) void verifyCode();
            }}
            style={{ display: "grid", gap: 12 }}
          >
            <label htmlFor="otp-code" style={{ color: "#0f172a", fontWeight: 600 }}>
              Kode 6 digit
            </label>
            <input
              autoFocus
              disabled={isLoading}
              id="otp-code"
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
              pattern="\d{6}"
              placeholder="••••••"
              required
              style={{ ...inputStyle, letterSpacing: 8, textAlign: "center" }}
              type="text"
              value={code}
            />
            <button
              disabled={isLoading || code.length !== 6}
              style={{
                background: "var(--color-primary)",
                border: "none",
                borderRadius: 8,
                color: "#fff",
                cursor: isLoading ? "wait" : "pointer",
                font: "inherit",
                fontWeight: 600,
                minHeight: 48,
                opacity: isLoading ? 0.7 : 1,
              }}
              type="submit"
            >
              {isLoading ? "Memeriksa..." : isSignup ? "Buat akun" : "Masuk"}
            </button>
            <button
              disabled={isLoading}
              onClick={() => {
                setStep("email");
                setCode("");
                setInfoMessage("");
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "#475569",
                cursor: "pointer",
                font: "inherit",
                textDecoration: "underline",
              }}
              type="button"
            >
              Ganti email / minta kode lagi
            </button>
          </form>
        )}

        {infoMessage ? (
          <p aria-live="polite" style={{ color: "#166534", margin: "16px 0 0" }}>
            {infoMessage}
          </p>
        ) : null}
        {errorMessage ? (
          <p aria-live="polite" role="alert" style={{ color: "#b91c1c", margin: "16px 0 0" }}>
            {errorMessage}
          </p>
        ) : null}

        <p style={{ color: "#475569", margin: "24px 0 0" }}>
          {isSignup ? "Sudah punya akun? " : "Belum punya akun? "}
          <a href={isSignup ? "/login" : "/register"} style={{ color: "#0f172a" }}>
            {isSignup ? "Masuk" : "Daftar"}
          </a>
        </p>
      </section>
    </main>
  );
}
