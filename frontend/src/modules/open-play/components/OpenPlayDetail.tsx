"use client";

import { useState } from "react";
import {
  Card,
  ErrorNote,
  formatTimeRange,
  Loading,
  rupiah,
  SPORT_LABEL,
  useAction,
  useLoad,
} from "@/modules/payments";
import { openPlayApi } from "../api";
import type { JoinResult } from "../types";

export function OpenPlayDetail({ id }: { id: string }) {
  const op = useLoad(() => openPlayApi.get(id), [id]);
  const [joined, setJoined] = useState<JoinResult | null>(null);
  const [left, setLeft] = useState(false);
  const { busy, error, run } = useAction();

  if (op.loading) return <Loading />;
  if (op.error || !op.data) return <ErrorNote message={op.error ?? "Open play tidak ditemukan"} />;
  const o = op.data;
  const full = o.confirmed >= o.quota;

  async function join() {
    const r = await run(() => openPlayApi.join(id));
    if (r) {
      setJoined(r);
      setLeft(false);
      await op.reload();
    }
  }
  async function leave() {
    // leave() mengembalikan 204 tanpa isi, jadi hasil `undefined` bukan tanda gagal; periksa error lewat state.
    let ok = false;
    await run(async () => {
      await openPlayApi.leave(id);
      ok = true;
    });
    if (ok) {
      setJoined(null);
      setLeft(true);
      await op.reload();
    }
  }

  return (
    <>
      <Card>
        <h2 style={{ marginTop: 0 }}>
          {SPORT_LABEL[o.sport]} di {o.venueName}
        </h2>
        <div>{o.courtName}</div>
        <div>{formatTimeRange(o.startsAt, o.endsAt)}</div>
        <div>
          {o.confirmed}/{o.quota} peserta · {o.price === 0 ? "Gratis" : rupiah(o.price)}
        </div>
        <div>Status: {o.status}</div>
      </Card>

      <ErrorNote message={error} />
      {joined?.status === "confirmed" && <p role="status">Kamu sudah terdaftar.</p>}
      {joined?.status === "pending_payment" && (
        <p role="status">
          Kursi ditahan sementara. Total {rupiah(joined.checkout.chargeAmount)}.{" "}
          {joined.checkout.redirectUrl ? (
            <a href={joined.checkout.redirectUrl}>Bayar sekarang</a>
          ) : (
            "Menunggu instruksi pembayaran."
          )}
        </p>
      )}
      {left && <p role="status">Kamu sudah membatalkan.</p>}

      <button type="button" disabled={busy || o.status !== "open" || full} onClick={join}>
        {full ? "Penuh" : "Join"}
      </button>{" "}
      <button type="button" disabled={busy} onClick={leave}>
        Batal join
      </button>
    </>
  );
}
