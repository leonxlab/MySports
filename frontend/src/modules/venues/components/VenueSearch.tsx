"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, ErrorNote, Loading, rupiah, SPORT_LABEL, useAction } from "@/modules/payments";
import { venuesApi } from "../api";
import { SPORTS, type Sport, type VenueView } from "../types";

// Titik awal pencarian bila lokasi perangkat belum diizinkan (Jakarta).
const DEFAULT_POS = { lat: -6.2, lng: 106.816 };

export function VenueSearch() {
  const [pos, setPos] = useState(DEFAULT_POS);
  const [sport, setSport] = useState<Sport | "">("");
  const [radiusKm, setRadiusKm] = useState(10);
  const [venues, setVenues] = useState<VenueView[] | null>(null);
  const { busy, error, run, setError } = useAction();

  async function search() {
    const result = await run(() =>
      venuesApi.searchVenues({ ...pos, radiusKm, sport: sport || undefined }),
    );
    if (result) setVenues(result);
  }

  function useMyLocation() {
    if (!navigator.geolocation) return setError("Perangkat tidak mendukung lokasi");
    navigator.geolocation.getCurrentPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setError("Lokasi tidak diizinkan, isi koordinat manual"),
    );
  }

  return (
    <>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
        <label>
          Lat{" "}
          <input type="number" step="any" value={pos.lat} onChange={(e) => setPos({ ...pos, lat: Number(e.target.value) })} style={{ width: 110 }} />
        </label>
        <label>
          Lng{" "}
          <input type="number" step="any" value={pos.lng} onChange={(e) => setPos({ ...pos, lng: Number(e.target.value) })} style={{ width: 110 }} />
        </label>
        <button type="button" onClick={useMyLocation}>
          Lokasi saya
        </button>
        <label>
          Cabang{" "}
          <select value={sport} onChange={(e) => setSport(e.target.value as Sport | "")}>
            <option value="">Semua</option>
            {SPORTS.map((s) => (
              <option key={s} value={s}>
                {SPORT_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Radius (km){" "}
          <input type="number" min={1} max={100} value={radiusKm} onChange={(e) => setRadiusKm(Number(e.target.value))} style={{ width: 70 }} />
        </label>
        <button type="button" onClick={search} disabled={busy}>
          Cari
        </button>
      </div>
      <ErrorNote message={error} />
      {busy && <Loading text="Mencari…" />}
      {venues?.length === 0 && <p>Tidak ada lapangan di sekitar sini.</p>}
      {venues?.map((v) => (
        <Card key={v.id}>
          <Link href={`/venues/${v.id}`}>
            <strong>{v.name}</strong>
          </Link>
          {v.distanceM !== undefined && <span> · {(v.distanceM / 1000).toFixed(1)} km</span>}
          <div>{v.address}</div>
          <div>
            {v.courts.map((c) => `${SPORT_LABEL[c.sport]} ${rupiah(c.pricePerHour)}/jam`).join(" · ")}
          </div>
        </Card>
      ))}
    </>
  );
}
