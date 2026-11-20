"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ErrorNote, useAction } from "@/modules/payments";
import { openPlayApi } from "../api";

// datetime-local menghasilkan waktu lokal tanpa zona; dikirim sebagai ISO dengan offset perangkat.
const toIso = (local: string) => new Date(local).toISOString();

export function CoachOpenPlayForm() {
  const router = useRouter();
  const [courtId, setCourtId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [quota, setQuota] = useState(8);
  const [price, setPrice] = useState(0);
  const { busy, error, run } = useAction();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const created = await run(() =>
      openPlayApi.create({ courtId, startsAt: toIso(startsAt), endsAt: toIso(endsAt), quota, price }),
    );
    if (created) router.push(`/coach/open-play/${created.id}`);
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 8, maxWidth: 420 }}>
      <p>
        Coach harus sudah menyewa lapangan (booking terkonfirmasi) untuk jam ini. Cari lapangan di{" "}
        <Link href="/venues">halaman lapangan</Link>, lalu tempel ID court di bawah.
      </p>
      <label>
        ID court
        <input value={courtId} onChange={(e) => setCourtId(e.target.value)} required pattern="[0-9a-fA-F-]{36}" style={{ width: "100%" }} />
      </label>
      <label>
        Mulai
        <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />
      </label>
      <label>
        Selesai
        <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} required />
      </label>
      <label>
        Kuota
        <input type="number" min={1} max={200} value={quota} onChange={(e) => setQuota(Number(e.target.value))} required />
      </label>
      <label>
        Harga per peserta (rupiah, 0 = gratis)
        <input type="number" min={0} step={1000} value={price} onChange={(e) => setPrice(Number(e.target.value))} required />
      </label>
      <button type="submit" disabled={busy}>
        {busy ? "Menyimpan…" : "Buat open play"}
      </button>
      <ErrorNote message={error} />
    </form>
  );
}
