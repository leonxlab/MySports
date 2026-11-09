"use client";

import Link from "next/link";
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
import type { OpenPlayStatus } from "../types";

const STATUS_ACTIONS: { status: OpenPlayStatus; label: string }[] = [
  { status: "closed", label: "Tutup pendaftaran" },
  { status: "open", label: "Buka lagi" },
  { status: "finished", label: "Tandai selesai" },
  { status: "cancelled", label: "Batalkan" },
];

export function CoachOpenPlayManage({ id }: { id: string }) {
  const op = useLoad(() => openPlayApi.get(id), [id]);
  const people = useLoad(() => openPlayApi.listParticipants(id), [id]);
  const { busy, error, run } = useAction();

  async function setStatus(status: OpenPlayStatus) {
    if (status === "cancelled" && !window.confirm("Batalkan open play ini?")) return;
    const updated = await run(() => openPlayApi.update(id, { status }));
    if (updated) {
      op.setData(updated);
      await people.reload();
    }
  }

  if (op.loading) return <Loading />;
  if (op.error || !op.data) return <ErrorNote message={op.error ?? "Open play tidak ditemukan"} />;
  const o = op.data;

  return (
    <>
      <Card>
        <strong>
          {SPORT_LABEL[o.sport]} di {o.venueName}
        </strong>
        <div>{formatTimeRange(o.startsAt, o.endsAt)}</div>
        <div>
          {o.confirmed}/{o.quota} peserta · {o.price === 0 ? "Gratis" : rupiah(o.price)} · {o.status}
        </div>
      </Card>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {STATUS_ACTIONS.filter((a) => a.status !== o.status).map((a) => (
          <button key={a.status} type="button" disabled={busy} onClick={() => setStatus(a.status)}>
            {a.label}
          </button>
        ))}
        <Link href={`/coach/open-play/${id}/bracket`}>Atur bracket</Link>
      </div>
      <ErrorNote message={error} />

      <h2>Peserta terkonfirmasi</h2>
      {people.loading && <Loading />}
      <ErrorNote message={people.error} />
      {people.data?.length === 0 && <p>Belum ada peserta.</p>}
      {people.data?.map((m) => (
        <Card key={m.id}>
          {m.displayName}
          {m.age ? ` · ${m.age} th` : ""}
          {m.level !== undefined ? ` · Level ${m.level}` : ""}
        </Card>
      ))}
    </>
  );
}
