"use client";

import Link from "next/link";
import {
  ErrorNote,
  formatTimeRange,
  Loading,
  rupiah,
  SPORT_LABEL,
  useAction,
  useLoad,
} from "@/modules/payments";
import { FocusShell, focusStyles } from "@/components/feed";
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

  if (op.loading)
    return (
      <FocusShell title="Sesi open play" exitHref={`/open-play/${id}`} status="Memuat">
        <Loading />
      </FocusShell>
    );
  if (op.error || !op.data)
    return (
      <FocusShell title="Sesi open play" exitHref={`/open-play/${id}`} status="Tidak tersedia">
        <ErrorNote message={op.error ?? "Open play tidak ditemukan"} />
      </FocusShell>
    );
  const o = op.data;
  const status =
    o.status === "open"
      ? "Pendaftaran terbuka"
      : o.status === "closed"
        ? "Pendaftaran ditutup"
        : o.status === "finished"
          ? "Selesai"
          : "Dibatalkan";

  return (
    <FocusShell
      title="Sesi open play"
      exitHref={`/open-play/${id}`}
      status={status}
      actions={
        <>
          {STATUS_ACTIONS.filter((a) => a.status !== o.status).map((a) => (
            <button
              key={a.status}
              type="button"
              disabled={busy}
              onClick={() => setStatus(a.status)}
            >
              {a.label}
            </button>
          ))}
          <Link href={`/coach/open-play/${id}/bracket`}>Atur bagan</Link>
        </>
      }
    >
      <section className={focusStyles.matchCard}>
        <strong>
          {SPORT_LABEL[o.sport]} di {o.venueName}
        </strong>
        <div>{formatTimeRange(o.startsAt, o.endsAt)}</div>
        <div>
          {o.confirmed}/{o.quota} peserta · {o.price === 0 ? "Gratis" : rupiah(o.price)} · {status}
        </div>
      </section>
      <ErrorNote message={error} />

      <h2>Peserta terkonfirmasi</h2>
      {people.loading && <Loading />}
      <ErrorNote message={people.error} />
      {people.data?.length === 0 && <p>Belum ada peserta.</p>}
      {people.data?.map((m) => (
        <p key={m.id}>
          {m.displayName}
          {m.age ? ` · ${m.age} th` : ""}
          {m.level !== undefined ? ` · Level ${m.level}` : ""}
        </p>
      ))}
    </FocusShell>
  );
}
