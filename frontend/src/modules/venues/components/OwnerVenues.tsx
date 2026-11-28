"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useState } from "react";
import { ErrorNote, rupiah, SPORT_LABEL, useAction, useLoad } from "@/modules/payments";
import { EmptyState, FeedShell, PostCard, RightPanel, Skeleton } from "@/components/feed";
import feedStyles from "@/components/feed/FeedPage.module.css";
import { venuesApi } from "../api";
import type { VenueStatus } from "../types";
import styles from "./OwnerVenueForm.module.css";

const INITIAL_LOCATION = { lat: -6.3055, lng: 107.1722 };
const VENUE_MAP_HEIGHT = 224;
const VenueMapPicker = dynamic(
  () => import("./VenueMapPicker").then((module) => module.VenueMapPicker),
  {
    ssr: false,
    loading: () => (
      <div className={styles.mapPlaceholder} role="status" style={{ height: VENUE_MAP_HEIGHT }}>
        Memuat peta…
      </div>
    ),
  },
);

const STATUS_LABEL: Record<VenueStatus, string> = {
  pending: "Menunggu persetujuan admin",
  approved: "Disetujui",
  rejected: "Ditolak",
};

function ApprovalNotice() {
  return (
    <div className={styles.info} role="note">
      <svg
        aria-hidden="true"
        className={styles.infoIcon}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
        viewBox="0 0 16 16"
      >
        <circle cx="8" cy="8" r="6" />
        <path d="M8 4.5v4l2.5 1.5" />
      </svg>
      <span>Lapangan baru menunggu persetujuan admin sebelum muncul di pencarian.</span>
    </div>
  );
}

export function OwnerVenues() {
  const venues = useLoad(() => venuesApi.listMine());
  const header = (
    <div className={feedStyles.headerInner}>
      <h1 className={feedStyles.pageTitle}>Lapangan saya</h1>
    </div>
  );
  const rightPanel = (
    <RightPanel title="Kelola lapangan">
      <p className={feedStyles.muted}>
        Ajukan lapangan baru untuk ditinjau admin atau kelola jadwal dan harga lapangan yang sudah
        terdaftar.
      </p>
    </RightPanel>
  );

  return (
    <FeedShell activeNav="venues" header={header} hideCompose rightPanel={rightPanel}>
      <div className={feedStyles.filters}>
        <Link className={feedStyles.primaryAction} href="/owner/venues/new">
          Daftarkan lapangan baru
        </Link>
      </div>
      {venues.loading ? <Skeleton rows={2} /> : null}
      {venues.error ? (
        <p className={feedStyles.error} role="alert">
          {venues.error}
        </p>
      ) : null}
      {!venues.loading && !venues.error && venues.data?.length === 0 ? (
        <EmptyState
          title="Belum ada lapangan"
          description="Daftarkan lapangan baru untuk mulai mengelolanya."
          action={
            <Link className={feedStyles.panelAction} href="/owner/venues/new">
              Daftarkan lapangan baru
            </Link>
          }
        />
      ) : null}
      {venues.data?.map((venue) => (
        <PostCard
          authorName={venue.name}
          body={venue.address}
          key={venue.id}
          recommendation={STATUS_LABEL[venue.status]}
          title={venue.name}
        >
          <div className={feedStyles.detailGrid}>
            <div>
              <strong>Lapangan</strong>
              {venue.courts.length === 0
                ? "Belum ada lapangan"
                : venue.courts
                    .map(
                      (court) =>
                        `${court.name} (${SPORT_LABEL[court.sport]}, ${rupiah(court.pricePerHour)}/jam)`,
                    )
                    .join(" · ")}
            </div>
          </div>
          <div className={feedStyles.cardActions}>
            <Link
              className={feedStyles.secondaryAction}
              href={`/owner/venues/${venue.id}/schedule`}
            >
              Kelola jadwal dan harga
            </Link>
          </div>
        </PostCard>
      ))}
    </FeedShell>
  );
}

export function OwnerVenueForm() {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState(String(INITIAL_LOCATION.lat));
  const [lng, setLng] = useState(String(INITIAL_LOCATION.lng));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submittedVenueId, setSubmittedVenueId] = useState<string | null>(null);
  const { busy, error, run } = useAction();

  function updateLocation(position: { lat: number; lng: number }) {
    setLat(position.lat.toFixed(6));
    setLng(position.lng.toFixed(6));
    setFieldErrors((current) => ({ ...current, lat: "", lng: "" }));
  }

  function parseCoordinate(value: string) {
    if (!value.trim()) return null;
    const coordinate = Number(value);
    return Number.isFinite(coordinate) ? coordinate : null;
  }

  function validate() {
    const latitude = parseCoordinate(lat);
    const longitude = parseCoordinate(lng);
    const nextErrors: Record<string, string> = {};

    if (!name.trim()) nextErrors.name = "Nama lapangan wajib diisi.";
    if (!address.trim()) nextErrors.address = "Alamat wajib diisi.";
    if (latitude === null) nextErrors.lat = "Masukkan latitude yang valid.";
    else if (latitude < -90 || latitude > 90) nextErrors.lat = "Latitude harus antara -90 dan 90.";
    if (longitude === null) nextErrors.lng = "Masukkan longitude yang valid.";
    else if (longitude < -180 || longitude > 180)
      nextErrors.lng = "Longitude harus antara -180 dan 180.";

    setFieldErrors(nextErrors);
    return { nextErrors, latitude, longitude };
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { nextErrors, latitude, longitude } = validate();
    if (Object.keys(nextErrors).length > 0 || latitude === null || longitude === null) return;

    const venue = await run(() =>
      venuesApi.createVenue({
        name: name.trim(),
        address: address.trim(),
        lat: latitude,
        lng: longitude,
      }),
    );
    if (venue) setSubmittedVenueId(venue.id);
  }

  function registerAnother() {
    setName("");
    setAddress("");
    setLat(String(INITIAL_LOCATION.lat));
    setLng(String(INITIAL_LOCATION.lng));
    setFieldErrors({});
    setSubmittedVenueId(null);
  }

  const latitude = parseCoordinate(lat);
  const longitude = parseCoordinate(lng);
  const mapValue =
    latitude !== null &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude !== null &&
    longitude >= -180 &&
    longitude <= 180
      ? { lat: latitude, lng: longitude }
      : null;

  if (submittedVenueId) {
    return (
      <section className={styles.success} aria-live="polite">
        <h2>Pengajuan terkirim</h2>
        <ApprovalNotice />
        <div className={styles.successActions}>
          <Link
            className={styles.secondaryButton}
            href={`/owner/venues/${submittedVenueId}/schedule`}
          >
            Atur court, jadwal, dan harga
          </Link>
          <button type="button" onClick={registerAnother}>
            Daftarkan lapangan lain
          </button>
        </div>
      </section>
    );
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <section className={styles.section} aria-labelledby="venue-info-title">
        <h2 className={styles.sectionTitle} id="venue-info-title">
          Informasi lapangan
        </h2>
        <label className={styles.field}>
          Nama lapangan
          <input
            aria-invalid={Boolean(fieldErrors.name)}
            className={fieldErrors.name ? styles.invalidInput : undefined}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setFieldErrors((current) => ({ ...current, name: "" }));
            }}
            maxLength={120}
            placeholder="Contoh: GOR Badminton Cikarang Baru"
          />
          {fieldErrors.name && <span className={styles.fieldError}>{fieldErrors.name}</span>}
        </label>
        <label className={styles.field}>
          Alamat
          <input
            aria-invalid={Boolean(fieldErrors.address)}
            className={fieldErrors.address ? styles.invalidInput : undefined}
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              setFieldErrors((current) => ({ ...current, address: "" }));
            }}
            maxLength={300}
            placeholder="Jalan, kelurahan, kota"
          />
          {fieldErrors.address && <span className={styles.fieldError}>{fieldErrors.address}</span>}
        </label>
      </section>

      <section className={styles.section} aria-labelledby="venue-location-title">
        <h2 className={styles.sectionTitle} id="venue-location-title">
          Titik lokasi
        </h2>
        <VenueMapPicker value={mapValue} onChange={updateLocation} height={VENUE_MAP_HEIGHT} />
        <div className={styles.coordinates}>
          <label className={styles.field}>
            Latitude
            <input
              aria-invalid={Boolean(fieldErrors.lat)}
              className={fieldErrors.lat ? styles.invalidInput : undefined}
              type="text"
              inputMode="decimal"
              value={lat}
              onChange={(e) => {
                const nextLat = e.target.value;
                setLat(nextLat);
                setFieldErrors((current) => ({ ...current, lat: "" }));
              }}
            />
            {fieldErrors.lat && <span className={styles.fieldError}>{fieldErrors.lat}</span>}
          </label>
          <label className={styles.field}>
            Longitude
            <input
              aria-invalid={Boolean(fieldErrors.lng)}
              className={fieldErrors.lng ? styles.invalidInput : undefined}
              type="text"
              inputMode="decimal"
              value={lng}
              onChange={(e) => {
                const nextLng = e.target.value;
                setLng(nextLng);
                setFieldErrors((current) => ({ ...current, lng: "" }));
              }}
            />
            {fieldErrors.lng && <span className={styles.fieldError}>{fieldErrors.lng}</span>}
          </label>
        </div>
      </section>

      <ApprovalNotice />
      <ErrorNote message={error} />
      <button className={styles.submitButton} type="submit" disabled={busy}>
        {busy ? "Mengirim…" : "Daftarkan lapangan"}
      </button>
    </form>
  );
}
