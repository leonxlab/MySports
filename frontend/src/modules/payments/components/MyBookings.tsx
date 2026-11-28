"use client";

import Link from "next/link";
import { EmptyState, FeedShell, PostCard, RightPanel, Skeleton } from "@/components/feed";
import styles from "@/components/feed/FeedPage.module.css";
import { paymentsApi } from "../api";
import { formatTimeRange } from "../format";
import { useLoad } from "../useLoad";

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Menunggu pembayaran",
  confirmed: "Terkonfirmasi",
  cancelled: "Dibatalkan",
  expired: "Kedaluwarsa",
};

export function MyBookings() {
  const { data, error, loading } = useLoad(() => paymentsApi.listMyBookings());
  const header = (
    <div className={styles.headerInner}>
      <h1 className={styles.pageTitle}>Peminjaman lapangan</h1>
    </div>
  );
  const rightPanel = (
    <RightPanel title="Cari lapangan">
      <p className={styles.muted}>Jadwalkan lapangan melalui jadwal court yang tersedia.</p>
      <Link className={styles.panelAction} href="/venues">
        Lihat lapangan
      </Link>
    </RightPanel>
  );

  return (
    <FeedShell activeNav="venues" header={header} rightPanel={rightPanel}>
      {loading ? <Skeleton /> : null}
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      {!loading && !error && data?.length === 0 ? (
        <EmptyState
          description="Jadwal booking lapangan yang kamu buat akan muncul di sini."
          title="Belum ada booking"
          action={
            <Link className={styles.panelAction} href="/venues">
              Cari lapangan
            </Link>
          }
        />
      ) : null}
      {data?.map((b) => (
        <PostCard
          authorName="Peminjaman lapangan"
          body={STATUS_LABEL[b.status] ?? b.status}
          key={b.id}
          sport="Lapangan"
          time={formatTimeRange(b.startsAt, b.endsAt)}
          title="Booking lapangan"
        >
          <div className={styles.detailGrid}>
            <div>
              <strong>Jadwal</strong>
              {formatTimeRange(b.startsAt, b.endsAt)}
            </div>
            <div>
              <strong>Status</strong>
              {STATUS_LABEL[b.status] ?? b.status}
            </div>
          </div>
          <Link className={styles.secondaryAction} href="/venues">
            Cari jadwal lain
          </Link>
        </PostCard>
      ))}
    </FeedShell>
  );
}
