"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import styles from "./FeedComponents.module.css";

export function TabBar({
  tabs,
  value,
  onChange,
  label = "Tab halaman",
}: {
  tabs: { value: string; label: string; href?: string }[];
  value: string;
  onChange?: (value: string) => void;
  label?: string;
}) {
  return (
    <nav aria-label={label} className={styles.tabBar}>
      {tabs.map((tab) =>
        tab.href ? (
          <Link
            aria-current={value === tab.value ? "page" : undefined}
            className={`${styles.tab}${value === tab.value ? ` ${styles.active}` : ""}`}
            href={tab.href}
            key={tab.value}
          >
            {tab.label}
          </Link>
        ) : (
          <button
            aria-pressed={value === tab.value}
            className={`${styles.tab}${value === tab.value ? ` ${styles.active}` : ""}`}
            key={tab.value}
            onClick={() => onChange?.(tab.value)}
            type="button"
          >
            {tab.label}
          </button>
        ),
      )}
    </nav>
  );
}

export function ChipFilter({
  label = "Filter",
  options,
  value,
  onChange,
}: {
  label?: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div aria-label={label} className={styles.chipRow} role="group">
      {options.map((option) => (
        <button
          aria-pressed={value === option.value}
          className={`${styles.chip}${value === option.value ? ` ${styles.selected}` : ""}`}
          key={option.value}
          onClick={() => onChange(option.value)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Composer({
  prompt,
  href,
  actionLabel = "Posting",
  children,
}: {
  prompt: string;
  href: string;
  actionLabel?: string;
  children?: ReactNode;
}) {
  return (
    <section aria-label="Buat postingan" className={styles.composer}>
      <span aria-hidden="true" className={styles.avatar}>
        K
      </span>
      <Link className={styles.composerPrompt} href={href}>
        {prompt}
      </Link>
      <div className={styles.composerActions}>
        {children}
        <Link className={styles.composerAction} href={href}>
          {actionLabel}
        </Link>
      </div>
    </section>
  );
}

export function PostCard({
  authorName,
  handle,
  time,
  sport,
  title,
  body,
  recommendation,
  avatarUrl,
  media,
  children,
  replyHref,
  shareUrl,
  initialLikes = 0,
  initiallyLiked = false,
  initiallySaved = false,
  onLike,
  onSave,
}: {
  authorName: string;
  handle?: string;
  time?: string;
  sport?: string;
  title?: string;
  body?: ReactNode;
  recommendation?: string;
  avatarUrl?: string;
  media?: { src: string; alt: string; type?: "image" | "video" }[];
  children?: ReactNode;
  replyHref?: string;
  shareUrl?: string;
  initialLikes?: number;
  initiallyLiked?: boolean;
  initiallySaved?: boolean;
  onLike?: (liked: boolean) => void | Promise<void>;
  onSave?: (saved: boolean) => void | Promise<void>;
}) {
  const [liked, setLiked] = useState(initiallyLiked);
  const [saved, setSaved] = useState(initiallySaved);
  const [likes, setLikes] = useState(initialLikes);
  const [message, setMessage] = useState<string | null>(null);
  const initials = authorName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();

  async function toggleLike() {
    const previous = liked;
    setLiked(!previous);
    setLikes((count) => count + (previous ? -1 : 1));
    setMessage(null);
    try {
      await onLike?.(!previous);
    } catch {
      setLiked(previous);
      setLikes((count) => count + (previous ? 1 : -1));
      setMessage("Suka belum tersimpan. Coba lagi.");
    }
  }

  async function toggleSave() {
    const previous = saved;
    setSaved(!previous);
    setMessage(null);
    try {
      await onSave?.(!previous);
    } catch {
      setSaved(previous);
      setMessage("Simpanan belum diperbarui. Coba lagi.");
    }
  }

  async function share() {
    const url =
      typeof window !== "undefined" && shareUrl
        ? new URL(shareUrl, window.location.origin).toString()
        : typeof window !== "undefined"
          ? window.location.href
          : "";
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Tautan berhasil disalin.");
    } catch {
      setMessage("Tautan tidak dapat disalin dari browser ini.");
    }
  }

  return (
    <article className={styles.postCard}>
      <div className={styles.postAvatar}>
        {avatarUrl ? <img alt="" src={avatarUrl} /> : initials}
      </div>
      <div className={styles.postContent}>
        <div className={styles.postMeta}>
          <strong>{authorName}</strong>
          {handle ? <span>{handle}</span> : null}
          {time ? <time>{time}</time> : null}
          {sport ? <span className={styles.sportTag}>{sport}</span> : null}
        </div>
        {title ? <h2 className={styles.postTitle}>{title}</h2> : null}
        {body ? <div className={styles.postBody}>{body}</div> : null}
        {children}
        {media?.length ? (
          <div className={styles.media}>
            {media.map((item) =>
              item.type === "video" ? (
                <video aria-label={item.alt} controls key={item.src} src={item.src} />
              ) : (
                <img alt={item.alt} key={item.src} src={item.src} />
              ),
            )}
          </div>
        ) : null}
        {recommendation ? <p className={styles.recommendation}>{recommendation}</p> : null}
        <div aria-label="Aksi postingan" className={styles.actions}>
          {replyHref ? (
            <Link aria-label="Balas postingan" href={replyHref}>
              Balas
            </Link>
          ) : (
            <button aria-label="Balas postingan" type="button">
              Balas
            </button>
          )}
          <button aria-label="Bagikan postingan" onClick={() => void share()} type="button">
            Bagikan
          </button>
          <button
            aria-pressed={liked}
            aria-label={liked ? "Batal suka" : "Suka"}
            onClick={() => void toggleLike()}
            type="button"
          >
            {liked ? "Disukai" : "Suka"} · {likes}
          </button>
          <button
            aria-pressed={saved}
            aria-label={saved ? "Hapus dari simpanan" : "Simpan postingan"}
            onClick={() => void toggleSave()}
            type="button"
          >
            {saved ? "Tersimpan" : "Simpan"}
          </button>
        </div>
        {message ? (
          <p aria-live="polite" className={styles.actionMessage} role="status">
            {message}
          </p>
        ) : null}
      </div>
    </article>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <section className={styles.emptyState}>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {action}
    </section>
  );
}

export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-label="Memuat konten" className={styles.skeletonList} role="status">
      {Array.from({ length: rows }, (_, index) => (
        <div className={styles.skeletonCard} key={index}>
          <span />
          <div>
            <i />
            <i />
            <i />
          </div>
        </div>
      ))}
    </div>
  );
}

export function StatusPill({
  status,
}: {
  status: "Tersedia" | "Diajukan" | "Dipinjam" | "Dikembalikan";
}) {
  return (
    <span className={`${styles.statusPill} ${styles[status.replaceAll(" ", "")]}`}>{status}</span>
  );
}
