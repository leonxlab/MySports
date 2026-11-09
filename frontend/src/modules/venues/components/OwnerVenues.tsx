"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, ErrorNote, Loading, rupiah, SPORT_LABEL, useAction, useLoad } from "@/modules/payments";
import { venuesApi } from "../api";
import type { VenueStatus } from "../types";

const STATUS_LABEL: Record<VenueStatus, string> = {
  pending: "Menunggu persetujuan admin",
  approved: "Disetujui",
  rejected: "Ditolak",
};

export function OwnerVenues() {
  const venues = useLoad(() => venuesApi.listMine());
  return (
    <>
      <p>
        <Link href="/owner/venues/new">Daftarkan lapangan baru</Link>
      </p>
      {venues.loading && <Loading />}
      <ErrorNote message={venues.error} />
      {venues.data?.length === 0 && <p>Belum ada lapangan.</p>}
      {venues.data?.map((v) => (
        <Card key={v.id}>
          <strong>{v.name}</strong> · {STATUS_LABEL[v.status]}
          <div>{v.address}</div>
          <div>
            {v.courts.length === 0
              ? "Belum ada court"
              : v.courts.map((c) => `${c.name} (${SPORT_LABEL[c.sport]}, ${rupiah(c.pricePerHour)}/jam)`).join(" · ")}
          </div>
          <Link href={`/owner/venues/${v.id}/schedule`}>Court, jadwal, dan harga</Link>
        </Card>
      ))}
    </>
  );
}

export function OwnerVenueForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const { busy, error, run, setError } = useAction();

  function useMyLocation() {
    if (!navigator.geolocation) return setError("Perangkat tidak mendukung lokasi");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLat(String(p.coords.latitude));
        setLng(String(p.coords.longitude));
      },
      () => setError("Lokasi tidak diizinkan, isi koordinat manual"),
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = await run(() =>
      venuesApi.createVenue({ name, address: address || undefined, lat: Number(lat), lng: Number(lng) }),
    );
    if (v) router.push(`/owner/venues/${v.id}/schedule`);
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 8, maxWidth: 420 }}>
      <label>
        Nama lapangan
        <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} style={{ width: "100%" }} />
      </label>
      <label>
        Alamat
        <input value={address} onChange={(e) => setAddress(e.target.value)} maxLength={300} style={{ width: "100%" }} />
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <label>
          Lat <input type="number" step="any" value={lat} onChange={(e) => setLat(e.target.value)} required min={-90} max={90} />
        </label>
        <label>
          Lng <input type="number" step="any" value={lng} onChange={(e) => setLng(e.target.value)} required min={-180} max={180} />
        </label>
      </div>
      <button type="button" onClick={useMyLocation}>
        Pakai lokasi saya
      </button>
      <button type="submit" disabled={busy}>
        {busy ? "Menyimpan…" : "Daftarkan"}
      </button>
      <ErrorNote message={error} />
      <small>Lapangan baru menunggu persetujuan admin sebelum muncul di pencarian.</small>
    </form>
  );
}
