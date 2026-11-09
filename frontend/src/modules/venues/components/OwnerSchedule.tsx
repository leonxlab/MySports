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
import { venuesApi } from "../api";
import { SPORTS, type CourtView, type Sport } from "../types";

const VENUE_STATUS = { approved: "Disetujui", pending: "Menunggu persetujuan", rejected: "Ditolak" } as const;

export function OwnerSchedule({ venueId }: { venueId: string }) {
  const venues = useLoad(() => venuesApi.listMine(), [venueId]);
  const [sport, setSport] = useState<Sport>("badminton");
  const [name, setName] = useState("");
  const [price, setPrice] = useState(0);
  const { busy, error, run } = useAction();

  if (venues.loading) return <Loading />;
  const venue = venues.data?.find((v) => v.id === venueId);
  if (!venue) return <ErrorNote message={venues.error ?? "Lapangan tidak ditemukan"} />;

  async function addCourt(e: React.FormEvent) {
    e.preventDefault();
    const c = await run(() => venuesApi.addCourt(venueId, { sport, name, pricePerHour: price }));
    if (c) {
      setName("");
      await venues.reload();
    }
  }

  return (
    <>
      <p>
        <strong>{venue.name}</strong> · {VENUE_STATUS[venue.status]}
      </p>
      {venue.courts.map((c) => (
        <CourtEditor key={c.id} court={c} onChanged={() => venues.reload()} />
      ))}
      <Card>
        <form onSubmit={addCourt} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
          <strong style={{ width: "100%" }}>Tambah court</strong>
          <label>
            Cabang{" "}
            <select value={sport} onChange={(e) => setSport(e.target.value as Sport)}>
              {SPORTS.map((s) => (
                <option key={s} value={s}>
                  {SPORT_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Nama <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} />
          </label>
          <label>
            Harga/jam{" "}
            <input type="number" min={0} step={1000} value={price} onChange={(e) => setPrice(Number(e.target.value))} style={{ width: 110 }} />
          </label>
          <button type="submit" disabled={busy}>
            Tambah
          </button>
        </form>
        <ErrorNote message={error} />
      </Card>
    </>
  );
}

// datetime-local menghasilkan waktu lokal tanpa zona; dikirim sebagai ISO.
const toIso = (local: string) => new Date(local).toISOString();
const SLOT_STATUS = { free: "Kosong", booked: "Dipesan", blocked: "Ditutup" } as const;

function CourtEditor({ court, onChanged }: { court: CourtView; onChanged: () => void }) {
  const [price, setPrice] = useState(court.pricePerHour);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [kind, setKind] = useState<"free" | "blocked">("free");
  const slots = useLoad(() => venuesApi.getAvailability(court.id, { from: new Date().toISOString() }), [court.id]);
  const priceAction = useAction();
  const slotAction = useAction();

  async function savePrice() {
    const c = await priceAction.run(() => venuesApi.setPrice(court.id, price));
    if (c) onChanged();
  }
  async function addSlot(e: React.FormEvent) {
    e.preventDefault();
    const r = await slotAction.run(() =>
      venuesApi.setAvailability(court.id, [{ startsAt: toIso(startsAt), endsAt: toIso(endsAt), status: kind }]),
    );
    if (r) {
      setStartsAt("");
      setEndsAt("");
      await slots.reload();
    }
  }

  return (
    <Card>
      <strong>
        {court.name} · {SPORT_LABEL[court.sport]}
      </strong>
      <div style={{ margin: "6px 0" }}>
        Harga sekarang {rupiah(court.pricePerHour)}/jam{" "}
        <input type="number" min={0} step={1000} value={price} onChange={(e) => setPrice(Number(e.target.value))} style={{ width: 110 }} />{" "}
        <button type="button" disabled={priceAction.busy || price === court.pricePerHour} onClick={savePrice}>
          Simpan harga
        </button>
        <ErrorNote message={priceAction.error} />
      </div>

      <form onSubmit={addSlot} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
        <label>
          Mulai <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />
        </label>
        <label>
          Selesai <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} required />
        </label>
        <label>
          Status{" "}
          <select value={kind} onChange={(e) => setKind(e.target.value as "free" | "blocked")}>
            <option value="free">Kosong (bisa disewa)</option>
            <option value="blocked">Ditutup</option>
          </select>
        </label>
        <button type="submit" disabled={slotAction.busy}>
          Tambah slot
        </button>
      </form>
      <ErrorNote message={slotAction.error} />

      <h4>Jadwal mendatang</h4>
      {slots.loading && <Loading />}
      <ErrorNote message={slots.error} />
      {slots.data?.length === 0 && <p>Belum ada slot.</p>}
      {slots.data?.map((s) => (
        <div key={s.id}>
          {formatTimeRange(s.startsAt, s.endsAt)} · {SLOT_STATUS[s.status]}
        </div>
      ))}
      <small>Slot yang sudah dipesan tidak bisa diubah dari sini.</small>
    </Card>
  );
}
