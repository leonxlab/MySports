"use client";

import Link from "next/link";
import { useState } from "react";
import { EmptyState, FeedShell, PostCard, RightPanel, Skeleton } from "@/components/feed";
import styles from "@/components/feed/FeedPage.module.css";
import { useMe } from "@/modules/accounts/components/SessionProvider";
import {
  formatDateTime,
  formatTimeRange,
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
  const header = (
    <div className={styles.headerInner}>
      <h1 className={styles.pageTitle}>Detail lapangan</h1>
    </div>
  );
  const rightPanel = (
    <RightPanel title="Lapangan">
      <p className={styles.muted}>Lihat jadwal court dan pilih waktu yang tersedia.</p>
      <Link className={styles.panelAction} href="/venues">
        Kembali ke pencarian
      </Link>
    </RightPanel>
  );

  if (venue.loading) {
    return (
      <FeedShell activeNav="venues" header={header} rightPanel={rightPanel}>
        <Skeleton rows={2} />
      </FeedShell>
    );
  }
  if (venue.error || !venue.data) {
    return (
      <FeedShell activeNav="venues" header={header} rightPanel={rightPanel}>
        <p className={styles.error} role="alert">
          {venue.error ?? "Lapangan tidak ditemukan."}
        </p>
      </FeedShell>
    );
  }

  const currentVenue = venue.data;
  const activeCourts = currentVenue.courts.filter((court) => court.active);

  return (
    <FeedShell activeNav="venues" header={header} rightPanel={rightPanel}>
      <PostCard
        authorName={currentVenue.name}
        body={currentVenue.address ?? "Alamat belum tersedia."}
        time={`${activeCourts.length} court aktif`}
        title={currentVenue.name}
      >
        <div className={styles.detailGrid}>
          <div>
            <strong>Koordinat</strong>
            {currentVenue.lat.toFixed(5)}, {currentVenue.lng.toFixed(5)}
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
        <a
          className={styles.secondaryAction}
          href={`https://www.openstreetmap.org/?mlat=${currentVenue.lat}&mlon=${currentVenue.lng}#map=16/${currentVenue.lat}/${currentVenue.lng}`}
          rel="noreferrer"
          target="_blank"
        >
          Lihat di peta
        </a>
      </PostCard>

      <section className={styles.section}>
        <h2>Jadwal lapangan</h2>
        {activeCourts.length ? (
          activeCourts.map((court) => <CourtCard court={court} key={court.id} />)
        ) : (
          <EmptyState title="Belum ada court aktif" />
        )}
      </section>

      <section className={styles.section}>
        <h2>Ulasan</h2>
        <EmptyState
          description="Layanan ulasan untuk lapangan belum tersedia."
          title="Belum ada ulasan"
        />
      </section>
    </FeedShell>
  );
}

function CourtCard({ court }: { court: CourtView }) {
  const [open, setOpen] = useState(false);
  return (
    <PostCard
      authorName={court.name}
      sport={SPORT_LABEL[court.sport]}
      title={`${court.name} · ${SPORT_LABEL[court.sport]}`}
    >
      <div className={styles.detailGrid}>
        <div>
          <strong>Tarif</strong>
          {rupiah(court.pricePerHour)}/jam
        </div>
        <div>
          <strong>Status</strong>
          Tersedia untuk dipesan
        </div>
      </div>
      <div className={styles.cardActions}>
        <button
          aria-expanded={open}
          className={styles.primaryAction}
          onClick={() => setOpen((current) => !current)}
          type="button"
        >
          {open ? "Tutup jadwal" : "Lihat jadwal"}
        </button>
      </div>
      {open ? <CourtSchedule court={court} /> : null}
    </PostCard>
  );
}

function CourtSchedule({ court }: { court: CourtView }) {
  const { user } = useMe();
  const from = new Date().toISOString();
  const slots = useLoad(() => venuesApi.getAvailability(court.id, { from }), [court.id]);
  const [checkout, setCheckout] = useState<CheckoutResult | null>(null);
  const { busy, error, run } = useAction();

  async function book(startsAt: string, endsAt: string) {
    const result = await run(() =>
      paymentsApi.createCourtBooking({ courtId: court.id, startsAt, endsAt }),
    );
    if (result) {
      setCheckout(result.checkout);
      await slots.reload();
    }
  }

  if (slots.loading) return <Skeleton rows={1} />;
  const free = slots.data?.filter((slot) => slot.status === "free") ?? [];

  return (
    <div className={styles.section}>
      <h2>Pilih jadwal</h2>
      {slots.error || error ? (
        <p className={styles.error} role="alert">
          {slots.error ?? error}
        </p>
      ) : null}
      {checkout ? (
        <p className={styles.inlineMessage} role="status">
          Pesanan dibuat. Total {rupiah(checkout.chargeAmount)}.{" "}
          {checkout.redirectUrl ? (
            <a href={checkout.redirectUrl}>Bayar sekarang</a>
          ) : (
            "Selesaikan pembayaran melalui QRIS di halaman status."
          )}{" "}
          <Link href={`/checkout/${checkout.paymentId}`}>Lihat status</Link>
        </p>
      ) : null}
      {!free.length && !slots.error ? (
        <p className={styles.muted}>Tidak ada jadwal kosong.</p>
      ) : null}
      {free.map((slot) => (
        <div className={styles.cardActions} key={slot.id}>
          <span className={styles.muted}>{formatTimeRange(slot.startsAt, slot.endsAt)}</span>
          {user ? (
            <button
              disabled={busy}
              onClick={() => void book(slot.startsAt, slot.endsAt)}
              type="button"
            >
              {busy ? "Memproses…" : "Pinjam lapangan"}
            </button>
          ) : (
            <Link className={styles.primaryAction} href="/login">
              Masuk untuk memesan
            </Link>
          )}
        </div>
      ))}
      <small className={styles.muted}>Jadwal diperbarui {formatDateTime(from)}</small>
    </div>
  );
}
