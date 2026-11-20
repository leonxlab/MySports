"use client";

import { Card, ErrorNote, Loading, SPORT_LABEL, useAction, useLoad } from "@/modules/payments";
import { venuesApi } from "../api";

export function AdminVenueApprovals() {
  const pending = useLoad(() => venuesApi.listPendingVenues());
  const { busy, error, run } = useAction();

  async function decide(id: string, approve: boolean) {
    if (!approve && !window.confirm("Tolak lapangan ini?")) return;
    const r = await run(() => (approve ? venuesApi.approveVenue(id) : venuesApi.rejectVenue(id)));
    if (r) await pending.reload();
  }

  if (pending.loading) return <Loading />;
  return (
    <>
      <ErrorNote message={pending.error ?? error} />
      {pending.data?.length === 0 && <p>Tidak ada lapangan yang menunggu persetujuan.</p>}
      {pending.data?.map((v) => (
        <Card key={v.id}>
          <strong>{v.name}</strong>
          <div>{v.address}</div>
          <div>
            Koordinat {v.lat.toFixed(5)}, {v.lng.toFixed(5)}
          </div>
          <div>{v.courts.map((c) => `${c.name} (${SPORT_LABEL[c.sport]})`).join(", ") || "Belum ada court"}</div>
          <button type="button" disabled={busy} onClick={() => decide(v.id, true)}>
            Setujui
          </button>{" "}
          <button type="button" disabled={busy} onClick={() => decide(v.id, false)}>
            Tolak
          </button>
        </Card>
      ))}
    </>
  );
}
