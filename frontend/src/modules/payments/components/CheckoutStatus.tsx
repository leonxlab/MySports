"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { paymentsApi } from "../api";
import { rupiah } from "../format";
import { useLoad } from "../useLoad";
import { Card, ErrorNote, Loading } from "./Status";

const LABEL: Record<string, string> = {
  pending: "Menunggu pembayaran",
  paid: "Pembayaran diterima",
  settled: "Pembayaran diterima",
  failed: "Pembayaran gagal",
  refunded: "Dikembalikan",
};

/**
 * Status pembayaran. Hanya tampilan: status akhir selalu dari backend (webhook gateway).
 * Selama masih pending, status ditanyakan ulang tiap 3 detik. Bila tagihan punya QRIS
 * (gateway LxPay), QR dirender dari payload yang dikirim server beserta nominal persis
 * yang harus dibayar (tagihan + kode unik gateway).
 */
export function CheckoutStatus({ id }: { id: string }) {
  const payment = useLoad(() => paymentsApi.getPayment(id), [id]);
  const pending = payment.data?.status === "pending";
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    if (!pending) return;
    const t = window.setInterval(() => void payment.reload(), 3000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  const payload = pending ? (payment.data?.qrisPayload ?? null) : null;
  useEffect(() => {
    if (!payload) {
      setQr(null);
      return;
    }
    let alive = true;
    QRCode.toDataURL(payload, { width: 280, margin: 1 })
      .then((url) => {
        if (alive) setQr(url);
      })
      .catch(() => {
        if (alive) setQr(null);
      });
    return () => {
      alive = false;
    };
  }, [payload]);

  if (payment.loading && !payment.data) return <Loading />;
  if (!payment.data) return <ErrorNote message={payment.error ?? "Pembayaran tidak ditemukan"} />;
  const p = payment.data;
  return (
    <Card>
      <div style={{ fontSize: 20 }}>
        <strong>{LABEL[p.status] ?? p.status}</strong>
      </div>
      <div>Total tagihan {rupiah(p.chargeAmount)}</div>
      {pending && p.qrisPayload && (
        <div style={{ textAlign: "center", margin: "12px 0" }}>
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="Kode QR QRIS" width={280} height={280} />
          ) : (
            <Loading text="Menyiapkan QR…" />
          )}
          <div>
            Bayar tepat <strong style={{ fontSize: 22 }}>{rupiah(p.amountWithCode)}</strong>
          </div>
          <small>
            Beberapa digit terakhir nominalnya sengaja dibuat unik (kode unik QRIS) supaya pembayaranmu
            terdeteksi otomatis. Jangan bayar nominal lain.
          </small>
          {p.expiresAt && (
            <div>
              <small>
                Berlaku sampai {new Date(p.expiresAt).toLocaleTimeString("id-ID", { timeStyle: "short" })}.
                Setelah lewat, tagih ulang dari halaman sebelumnya.
              </small>
            </div>
          )}
        </div>
      )}
      {pending && <p role="status">Menunggu konfirmasi dari penyedia pembayaran. Halaman ini diperbarui otomatis.</p>}
      {p.status === "failed" && <p>Kursi atau jam yang ditahan dilepas. Coba lagi dari halaman sebelumnya.</p>}
      <ErrorNote message={payment.error} />
    </Card>
  );
}
