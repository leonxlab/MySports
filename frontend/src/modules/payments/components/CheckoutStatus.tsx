"use client";

import { useEffect } from "react";
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
 * Selama masih pending, status ditanyakan ulang tiap 3 detik.
 */
export function CheckoutStatus({ id }: { id: string }) {
  const payment = useLoad(() => paymentsApi.getPayment(id), [id]);
  const pending = payment.data?.status === "pending";

  useEffect(() => {
    if (!pending) return;
    const t = window.setInterval(() => void payment.reload(), 3000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  if (payment.loading && !payment.data) return <Loading />;
  if (!payment.data) return <ErrorNote message={payment.error ?? "Pembayaran tidak ditemukan"} />;
  const p = payment.data;
  return (
    <Card>
      <div style={{ fontSize: 20 }}>
        <strong>{LABEL[p.status] ?? p.status}</strong>
      </div>
      <div>Total {rupiah(p.chargeAmount)}</div>
      {pending && <p role="status">Menunggu konfirmasi dari penyedia pembayaran. Halaman ini diperbarui otomatis.</p>}
      {p.status === "failed" && <p>Kursi atau jam yang ditahan dilepas. Coba lagi dari halaman sebelumnya.</p>}
      <ErrorNote message={payment.error} />
    </Card>
  );
}
