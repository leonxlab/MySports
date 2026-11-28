"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ChipFilter,
  EmptyState,
  FeedShell,
  PostCard,
  RightPanel,
  Skeleton,
} from "@/components/feed";
import styles from "@/components/feed/FeedPage.module.css";
import { useMe } from "@/modules/accounts/components/SessionProvider";
import { rupiah, SPORT_LABEL, useAction } from "@/modules/payments";
import { SPORTS, type Sport, type VenueView } from "../types";
import { venuesApi } from "../api";

const DEFAULT_POS = { lat: -6.2, lng: 106.816 };

export function VenueSearch() {
  const { user, me } = useMe();
  const [pos, setPos] = useState(DEFAULT_POS);
  const [sport, setSport] = useState<Sport | "">("");
  const [radiusKm, setRadiusKm] = useState(10);
  const [venues, setVenues] = useState<VenueView[] | null>(null);
  const { busy, error, run, setError } = useAction();
  const ownerHref = !user
    ? "/login"
    : me?.roles.includes("owner")
      ? "/owner/venues"
      : "/apply/owner";
  const header = (
    <div className={styles.headerInner}>
      <h1 className={styles.pageTitle}>Lapangan</h1>
      <ChipFilter
        label="Filter cabang olahraga"
        onChange={(value) => setSport(value as Sport | "")}
        options={[
          { value: "", label: "Semua cabang" },
          ...SPORTS.map((item) => ({ value: item, label: SPORT_LABEL[item] })),
        ]}
        value={sport}
      />
    </div>
  );
  const rightPanel = (
    <>
      <RightPanel title="Untuk pemilik lapangan">
        <p className={styles.muted}>
          Kelola lapangan yang sudah terdaftar atau ajukan lapangan baru.
        </p>
        <Link className={styles.panelAction} href={ownerHref}>
          Lapangan saya
        </Link>
      </RightPanel>
      <RightPanel title="Tips pencarian">
        <p className={styles.muted}>
          Gunakan lokasimu atau isi koordinat, lalu pilih cabang olahraga dan radius.
        </p>
      </RightPanel>
      <RightPanel title="Peminjaman lapangan">
        <p className={styles.muted}>
          Lihat contoh alur pengajuan dan persetujuan pemilik. Data di sana bersifat pratinjau.
        </p>
        <Link className={styles.panelAction} href="/venues/loans">
          Lihat permintaan
        </Link>
      </RightPanel>
    </>
  );

  async function search() {
    const result = await run(() =>
      venuesApi.searchVenues({ ...pos, radiusKm, sport: sport || undefined }),
    );
    if (result) setVenues(result);
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("Perangkat tidak mendukung lokasi. Isi koordinat secara manual.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPos({ lat: position.coords.latitude, lng: position.coords.longitude });
        setError(null);
      },
      (cause) => {
        setError(
          cause.code === cause.PERMISSION_DENIED
            ? "Izin lokasi ditolak. Isi koordinat secara manual."
            : "Lokasi tidak tersedia. Isi koordinat secara manual.",
        );
      },
    );
  }

  return (
    <FeedShell activeNav="venues" header={header} rightPanel={rightPanel}>
      <div className={styles.filters}>
        <label className={styles.filterField}>
          Latitude
          <input
            type="number"
            step="any"
            value={pos.lat}
            onChange={(event) => setPos({ ...pos, lat: Number(event.target.value) })}
          />
        </label>
        <label className={styles.filterField}>
          Longitude
          <input
            type="number"
            step="any"
            value={pos.lng}
            onChange={(event) => setPos({ ...pos, lng: Number(event.target.value) })}
          />
        </label>
        <label className={styles.filterField}>
          Radius (km)
          <select value={radiusKm} onChange={(event) => setRadiusKm(Number(event.target.value))}>
            {[5, 10, 25, 50, 100].map((distance) => (
              <option key={distance} value={distance}>
                {distance} km
              </option>
            ))}
          </select>
        </label>
        <div className={styles.cardActions}>
          <button className={styles.secondaryAction} onClick={useMyLocation} type="button">
            Lokasi saya
          </button>
          <button
            className={styles.primaryAction}
            disabled={busy}
            onClick={() => void search()}
            type="button"
          >
            {busy ? "Mencari…" : "Cari lapangan"}
          </button>
        </div>
      </div>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      {busy ? <Skeleton /> : null}
      {venues?.length === 0 ? (
        <EmptyState
          description="Coba ubah lokasi, radius, atau cabang olahraga."
          title="Tidak ada lapangan di sekitar sini"
        />
      ) : null}
      {venues?.map((venue) => (
        <VenueCard key={venue.id} venue={venue} userIsLoggedIn={Boolean(user)} />
      ))}
      {venues === null && !busy ? (
        <EmptyState
          description="Pilih lokasi dan filter, lalu cari lapangan di sekitarmu."
          title="Temukan lapangan"
        />
      ) : null}
    </FeedShell>
  );
}

function VenueCard({ venue, userIsLoggedIn }: { venue: VenueView; userIsLoggedIn: boolean }) {
  const activeCourts = venue.courts.filter((court) => court.active);
  const sports = [...new Set(activeCourts.map((court) => SPORT_LABEL[court.sport]))];
  const startingPrice = activeCourts.length
    ? Math.min(...activeCourts.map((court) => court.pricePerHour))
    : null;
  const bookingHref = userIsLoggedIn ? `/venues/${venue.id}` : "/login";

  return (
    <PostCard
      authorName={venue.name}
      body={venue.address ?? "Alamat belum tersedia."}
      replyHref={`/venues/${venue.id}`}
      sport={sports.join(" · ")}
      time={venue.distanceM !== undefined ? `${(venue.distanceM / 1000).toFixed(1)} km` : undefined}
      title={venue.name}
    >
      <div className={styles.detailGrid}>
        <div>
          <strong>Lapangan aktif</strong>
          {activeCourts.length} court
        </div>
        <div>
          <strong>Tarif mulai</strong>
          {startingPrice === null ? "Belum tersedia" : `${rupiah(startingPrice)}/jam`}
        </div>
        <div>
          <strong>Jam operasional</strong>
          Belum tersedia
        </div>
        <div>
          <strong>Foto</strong>
          Belum tersedia
        </div>
      </div>
      <div className={styles.cardActions}>
        <Link className={styles.secondaryAction} href={`/venues/${venue.id}`}>
          Lihat jadwal
        </Link>
        <Link className={styles.primaryAction} href={bookingHref}>
          Pinjam lapangan
        </Link>
      </div>
    </PostCard>
  );
}
