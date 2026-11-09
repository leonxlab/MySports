"use client";

import { useState } from "react";
import {
  Card,
  ErrorNote,
  formatDateTime,
  formatTimeRange,
  Loading,
  paymentsApi,
  rupiah,
  SPORT_LABEL,
  useAction,
  useLoad,
  type CheckoutResult,
} from "@/modules/payments";
import { venuesApi } from "../api";
import type { CourtView } from "../types";

export function VenueDetail({ id }: { id: string }) {
  const venue = useLoad(() => venuesApi.getVenue(id), [id]);
  if (venue.loading) return <Loading />;
  if (venue.error || !venue.data) return <ErrorNote message={venue.error ?? "Lapangan tidak ditemukan"} />;
  const v = venue.data;
  return (
    <>
      <p>{v.address}</p>
      {v.courts.filter((c) => c.active).map((c) => (
        <CourtCard key={c.id} court={c} />
      ))}
    </>
  );
}

function CourtCard({ court }: { court: CourtView }) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <strong>{court.name}</strong> · {SPORT_LABEL[court.sport]} · {rupiah(court.pricePerHour)}/jam{" "}
      <button type="button" onClick={() => setOpen(!open)}>
        {open ? "Tutup" : "Lihat jadwal"}
      </button>
      {open && <CourtSchedule court={court} />}
    </Card>
  );
}

function CourtSchedule({ court }: { court: CourtView }) {
  const from = new Date().toISOString();
  const slots = useLoad(() => venuesApi.getAvailability(court.id, { from }), [court.id]);
  const [checkout, setCheckout] = useState<CheckoutResult | null>(null);
  const { busy, error, run } = useAction();

  async function book(startsAt: string, endsAt: string) {
    const r = await run(() => paymentsApi.createCourtBooking({ courtId: court.id, startsAt, endsAt }));
    if (r) {
      setCheckout(r.checkout);
      await slots.reload();
    }
  }

  if (slots.loading) return <Loading />;
  const free = slots.data?.filter((s) => s.status === "free") ?? [];
  return (
    <div>
      <ErrorNote message={slots.error ?? error} />
      {checkout && (
        <p role="status">
          Booking dibuat. Total {rupiah(checkout.chargeAmount)}.{" "}
          {checkout.redirectUrl ? <a href={checkout.redirectUrl}>Bayar sekarang</a> : "Menunggu instruksi pembayaran."}
        </p>
      )}
      {free.length === 0 && <p>Tidak ada jam kosong.</p>}
      {free.map((s) => (
        <div key={s.id}>
          {formatTimeRange(s.startsAt, s.endsAt)}{" "}
          <button type="button" disabled={busy} onClick={() => book(s.startsAt, s.endsAt)}>
            Sewa
          </button>
        </div>
      ))}
      <small>Jadwal diperbarui {formatDateTime(from)}</small>
    </div>
  );
}
