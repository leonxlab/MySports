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
import { useMe } from "@/modules/accounts/components/SessionProvider";
import { formatTimeRange, rupiah, SPORT_LABEL, useLoad } from "@/modules/payments";
import { SPORTS, type Sport } from "@/modules/venues";
import { openPlayApi } from "../api";
import type { OpenPlayView } from "../types";
import styles from "@/components/feed/FeedPage.module.css";

function openPlayStatus(status: string) {
  if (status === "open") return "Terbuka";
  if (status === "closed") return "Penuh";
  if (status === "cancelled") return "Dibatalkan";
  return "Selesai";
}

export function OpenPlayList() {
  const { user } = useMe();
  const [sport, setSport] = useState<Sport | "">("");
  const [date, setDate] = useState("");
  const list = useLoad(
    () => openPlayApi.search({ sport: sport || undefined, date: date || undefined }),
    [sport, date],
  );
  const header = (
    <div className={styles.headerInner}>
      <h1 className={styles.pageTitle}>Open play</h1>
      <ChipFilter
        label="Filter cabang olahraga"
        onChange={(value) => setSport(value as Sport | "")}
        options={[
          { value: "", label: "Semua cabang" },
          ...SPORTS.map((item) => ({ value: item, label: SPORT_LABEL[item] })),
        ]}
        value={sport}
      />
      <div className={styles.filters}>
        <label className={styles.filterField}>
          Tanggal
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
      </div>
    </div>
  );
  const rightPanel = (
    <RightPanel title="Atur pencarian">
      <p className={styles.muted}>Cari sesi olahraga berdasarkan cabang dan tanggal.</p>
      <Link className={styles.panelAction} href="/coach/open-play/new">
        Buat open play
      </Link>
    </RightPanel>
  );

  return (
    <FeedShell activeNav="open-play" header={header} rightPanel={rightPanel}>
      {list.loading ? <Skeleton /> : null}
      {list.error ? (
        <p className={styles.error} role="alert">
          {list.error}
        </p>
      ) : null}
      {!list.loading && !list.error && list.data?.length === 0 ? (
        <EmptyState
          description="Coba ubah cabang olahraga atau tanggal pencarian."
          title="Belum ada open play"
        />
      ) : null}
      {list.data?.map((openPlay) => (
        <OpenPlayCard
          key={openPlay.id}
          openPlay={openPlay}
          joinHref={user ? `/open-play/${openPlay.id}` : "/login"}
        />
      ))}
    </FeedShell>
  );
}

function OpenPlayCard({ openPlay, joinHref }: { openPlay: OpenPlayView; joinHref: string }) {
  const start = new Date(openPlay.startsAt);
  const dateTime = start.toLocaleString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <PostCard
      authorName={openPlay.venueName}
      body={openPlayStatus(openPlay.status)}
      replyHref={`/open-play/${openPlay.id}`}
      sport={SPORT_LABEL[openPlay.sport]}
      time={dateTime}
      title={`${SPORT_LABEL[openPlay.sport]} di ${openPlay.venueName}`}
    >
      <div className={styles.detailGrid}>
        <div>
          <strong>Waktu</strong>
          {formatTimeRange(openPlay.startsAt, openPlay.endsAt)}
        </div>
        <div>
          <strong>Lokasi</strong>
          {openPlay.venueName} · {openPlay.courtName}
          {openPlay.distanceM !== undefined
            ? ` · ${(openPlay.distanceM / 1000).toFixed(1)} km`
            : ""}
        </div>
        <div>
          <strong>Slot terisi</strong>
          {openPlay.confirmed} dari {openPlay.quota}
        </div>
        <div>
          <strong>Biaya</strong>
          {openPlay.price === 0 ? "Gratis" : rupiah(openPlay.price)}
        </div>
        <div>
          <strong>Level</strong>
          Level belum dicantumkan
        </div>
      </div>
      <div className={styles.cardActions}>
        <Link className={styles.primaryAction} href={joinHref}>
          Gabung
        </Link>
        <span className={styles.muted}>{openPlayStatus(openPlay.status)}</span>
      </div>
    </PostCard>
  );
}
