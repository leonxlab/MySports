"use client";

import Link from "next/link";
import { useState } from "react";
import { FocusShell, focusStyles } from "@/components/feed";
import { useMe } from "@/modules/accounts/components/SessionProvider";
import { rupiah, SPORT_LABEL, useAction, useLoad, type CheckoutResult } from "@/modules/payments";
import { openPlayApi } from "../api";
import type { JoinResult } from "../types";
import styles from "./OpenPlayDetail.module.css";

const participantColors = ["#0ea5e9", "#db2777", "#ea7a18", "#9333a7", "#0f9f88"];

function openPlayStatus(status: string) {
  if (status === "open") return "Pendaftaran terbuka";
  if (status === "closed") return "Pendaftaran ditutup";
  if (status === "cancelled") return "Dibatalkan";
  return "Selesai";
}

function formatClock(value: string) {
  return new Date(value).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatDuration(start: string, end: string) {
  const minutes = Math.max(0, Math.round((Date.parse(end) - Date.parse(start)) / 60000));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours && remainingMinutes) return `${hours} jam ${remainingMinutes} menit`;
  if (hours) return `${hours} jam`;
  return `${minutes} menit`;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

export function OpenPlayDetail({ id }: { id: string }) {
  const { user, me } = useMe();
  const op = useLoad(() => openPlayApi.get(id), [id]);
  const canViewParticipants = Boolean(user && me?.roles.includes("coach"));
  const participants = useLoad(
    () => (canViewParticipants ? openPlayApi.listParticipants(id) : Promise.resolve([])),
    [id, canViewParticipants],
  );
  const [joined, setJoined] = useState<JoinResult | null>(null);
  const [left, setLeft] = useState(false);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const { busy, error, run } = useAction();
  const openPlay = op.data;
  const full = openPlay ? openPlay.confirmed >= openPlay.quota : false;
  const isHost = Boolean(
    user && openPlay && (user.id === openPlay.coachId || me?.roles.includes("coach")),
  );
  const status = openPlay
    ? openPlayStatus(openPlay.status)
    : op.loading
      ? "Memuat"
      : "Tidak tersedia";

  async function join() {
    const result = await run(() => openPlayApi.join(id));
    if (result) {
      setJoined(result);
      setLeft(false);
      await op.reload();
    }
  }

  async function leave() {
    let succeeded = false;
    await run(async () => {
      await openPlayApi.leave(id);
      succeeded = true;
    });
    if (succeeded) {
      setJoined(null);
      setLeft(true);
      await op.reload();
    }
  }

  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareMessage("Tautan berhasil disalin.");
    } catch {
      setShareMessage("Tautan tidak dapat disalin dari browser ini.");
    }
  }

  function paymentNotice(checkout: CheckoutResult) {
    return (
      <>
        Kursi ditahan sementara. Total {rupiah(checkout.chargeAmount)}.{" "}
        {checkout.redirectUrl ? (
          <a href={checkout.redirectUrl}>Bayar sekarang</a>
        ) : (
          "Selesaikan pembayaran (QRIS) di halaman status."
        )}{" "}
        <Link href={`/checkout/${checkout.paymentId}`}>Lihat status</Link>
      </>
    );
  }

  const headerAction = (
    <div className={styles.headerActions}>
      <span className={focusStyles.status}>{status}</span>
      {openPlay ? (
        <button
          aria-label="Bagikan sesi open play"
          className={focusStyles.iconButton}
          onClick={() => void share()}
          type="button"
        >
          <svg
            aria-hidden="true"
            fill="none"
            height="20"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            viewBox="0 0 24 24"
            width="20"
          >
            <path d="M12 16V4m0 0L8 8m4-4 4 4M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6" />
          </svg>
        </button>
      ) : null}
    </div>
  );

  let footerAction;
  if (openPlay && user && joined?.status === "confirmed") {
    footerAction = (
      <button
        className={styles.secondaryButton}
        disabled={busy}
        onClick={() => void leave()}
        type="button"
      >
        {busy ? "Memproses…" : "Batal bergabung"}
      </button>
    );
  } else if (openPlay && joined?.status === "pending_payment") {
    footerAction = (
      <Link className={styles.primaryButton} href={`/checkout/${joined.checkout.paymentId}`}>
        Lihat status pembayaran
      </Link>
    );
  } else if (!user) {
    footerAction = (
      <Link className={styles.primaryButton} href="/login">
        Gabung sesi
      </Link>
    );
  } else if (openPlay) {
    const disabled = busy || openPlay.status !== "open" || full;
    footerAction = (
      <button
        className={styles.primaryButton}
        disabled={disabled}
        onClick={() => void join()}
        type="button"
      >
        {busy
          ? "Memproses…"
          : full
            ? "Slot penuh"
            : openPlay.status === "open"
              ? "Gabung sesi"
              : "Pendaftaran ditutup"}
      </button>
    );
  }

  return (
    <FocusShell
      actions={
        openPlay ? (
          <div className={styles.stickyCta}>
            <div className={styles.price}>
              <strong>{openPlay.price === 0 ? "Gratis" : rupiah(openPlay.price)}</strong>
              <span>per orang</span>
            </div>
            {footerAction}
          </div>
        ) : undefined
      }
      backLabel="Kembali ke daftar open play"
      exitHref="/open-play"
      headerAction={headerAction}
      status={status}
      title="Sesi open play"
    >
      <div className={styles.page}>
        {op.loading ? (
          <p className={styles.muted} role="status">
            Memuat sesi open play…
          </p>
        ) : null}
        {op.error || (!op.loading && !openPlay) ? (
          <p className={styles.error} role="alert">
            {op.error ?? "Open play tidak ditemukan."}
          </p>
        ) : null}

        {openPlay ? (
          <>
            <span className={styles.sportTag}>{SPORT_LABEL[openPlay.sport]}</span>
            <h2 className={styles.title}>
              {SPORT_LABEL[openPlay.sport]} di {openPlay.venueName}
            </h2>

            <div className={styles.details}>
              <div className={styles.detailRow}>
                <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
                  <rect height="16" rx="2" width="18" x="3" y="5" />
                  <path d="M16 3v4M8 3v4M3 10h18" />
                </svg>
                <div>
                  <strong>
                    {new Date(openPlay.startsAt).toLocaleDateString("id-ID", {
                      weekday: "long",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </strong>
                  <span>
                    {formatClock(openPlay.startsAt)} – {formatClock(openPlay.endsAt)} ·{" "}
                    {formatDuration(openPlay.startsAt, openPlay.endsAt)}
                  </span>
                </div>
              </div>

              <div className={styles.detailRow}>
                <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
                  <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
                  <circle cx="12" cy="10" r="2.5" />
                </svg>
                <div>
                  <strong>{openPlay.venueName}</strong>
                  <span>{openPlay.courtName}</span>
                  <a
                    href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(`${openPlay.venueName} ${openPlay.courtName}`)}`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Lihat di peta
                  </a>
                </div>
              </div>

              <div className={styles.detailRow}>
                <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
                  <rect height="14" rx="2" width="18" x="3" y="5" />
                  <path d="M3 10h18M7 15h3" />
                </svg>
                <div>
                  <strong>
                    {openPlay.price === 0
                      ? "Gratis per orang"
                      : `${rupiah(openPlay.price)} per orang`}
                  </strong>
                </div>
              </div>
            </div>

            <section aria-label="Kapasitas peserta" className={styles.capacity}>
              <div className={styles.capacityHeader}>
                <strong>
                  {openPlay.confirmed} dari {openPlay.quota} peserta
                </strong>
                <span>{Math.max(0, openPlay.quota - openPlay.confirmed)} slot tersisa</span>
              </div>
              <div
                aria-label={`${openPlay.confirmed} dari ${openPlay.quota} peserta`}
                aria-valuemax={Math.max(openPlay.quota, 1)}
                aria-valuemin={0}
                aria-valuenow={openPlay.confirmed}
                className={styles.capacityTrack}
                role="progressbar"
              >
                {Array.from({ length: Math.max(1, Math.min(openPlay.quota, 12)) }, (_, index) => {
                  const segments = Math.max(1, Math.min(openPlay.quota, 12));
                  const filled = Math.round(
                    (Math.min(openPlay.confirmed, openPlay.quota) / Math.max(openPlay.quota, 1)) *
                      segments,
                  );
                  return (
                    <span className={index < filled ? styles.capacityFilled : ""} key={index} />
                  );
                })}
              </div>
            </section>

            {shareMessage ? (
              <p className={styles.inlineMessage} role="status">
                {shareMessage}
              </p>
            ) : null}
            {joined?.status === "confirmed" ? (
              <p className={styles.inlineMessage} role="status">
                Kamu sudah terdaftar.
              </p>
            ) : null}
            {joined?.status === "pending_payment" ? (
              <p className={styles.inlineMessage} role="status">
                {paymentNotice(joined.checkout)}
              </p>
            ) : null}
            {left ? (
              <p className={styles.inlineMessage} role="status">
                Keikutsertaan dibatalkan.
              </p>
            ) : null}
            {error ? (
              <p className={styles.error} role="alert">
                {error}
              </p>
            ) : null}
            {isHost ? (
              <Link className={styles.hostLink} href={`/coach/open-play/${openPlay.id}`}>
                Kelola sesi open play
              </Link>
            ) : null}

            <section className={styles.participants}>
              <div className={styles.participantHeading}>
                <h2>Peserta terkonfirmasi</h2>
                <span>{openPlay.confirmed}</span>
              </div>
              {canViewParticipants ? (
                <>
                  {participants.loading ? (
                    <p className={styles.muted} role="status">
                      Memuat peserta…
                    </p>
                  ) : null}
                  {participants.error ? (
                    <p className={styles.error} role="alert">
                      {participants.error}
                    </p>
                  ) : null}
                  {!participants.loading && !participants.error && !participants.data?.length ? (
                    <p className={styles.muted}>Belum ada peserta terkonfirmasi.</p>
                  ) : null}
                  {participants.data?.map((participant, index) => (
                    <div className={styles.participantRow} key={participant.id}>
                      <span
                        aria-hidden="true"
                        className={styles.participantAvatar}
                        style={{
                          backgroundColor: participantColors[index % participantColors.length],
                        }}
                      >
                        {initials(participant.displayName)}
                      </span>
                      <strong>{participant.displayName}</strong>
                    </div>
                  ))}
                </>
              ) : (
                <p className={styles.privateMessage}>
                  Daftar nama peserta hanya tersedia untuk Coach.
                </p>
              )}
              {Array.from(
                { length: Math.min(Math.max(0, openPlay.quota - openPlay.confirmed), 8) },
                (_, index) => (
                  <div className={styles.participantRow} key={`empty-${index}`}>
                    <span aria-hidden="true" className={styles.emptyAvatar}>
                      +
                    </span>
                    <span className={styles.muted}>Slot kosong</span>
                  </div>
                ),
              )}
            </section>
          </>
        ) : null}
      </div>
    </FocusShell>
  );
}
