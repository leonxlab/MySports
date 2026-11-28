"use client";

import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { useMe } from "@/modules/accounts/components/SessionProvider";
import styles from "./FeedShell.module.css";

export type FeedNavItem =
  "home" | "community" | "open-play" | "venues" | "equipment" | "notifications" | "profile";

const navigation: { id: FeedNavItem; label: string; href: string; icon: ReactNode }[] = [
  {
    id: "home",
    label: "Beranda",
    href: "/",
    icon: <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  },
  {
    id: "community",
    label: "Komunitas",
    href: "/community",
    icon: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20v-1a6 6 0 0 1 12 0v1M16 5.2a3 3 0 0 1 0 5.6M18 14a5 5 0 0 1 3 5v1" />
      </>
    ),
  },
  {
    id: "open-play",
    label: "Open play",
    href: "/open-play",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M7 4.5c2.5 2 3.5 4 3.5 7.5S9.5 17.5 7 19.5M17 4.5c-2.5 2-3.5 4-3.5 7.5s1 5.5 3.5 7.5" />
      </>
    ),
  },
  {
    id: "venues",
    label: "Lapangan",
    href: "/venues",
    icon: (
      <>
        <rect height="16" rx="2" width="18" x="3" y="4" />
        <path d="M7 8h3v3H7zM14 8h3v3h-3zM7 14h3v3H7zM14 14h3v3h-3z" />
      </>
    ),
  },
  {
    id: "equipment",
    label: "Peminjaman alat",
    href: "/equipment",
    icon: (
      <>
        <path d="m4 8 8-4 8 4-8 4-8-4Z" />
        <path d="m4 12 8 4 8-4M4 16l8 4 8-4M12 12v8" />
      </>
    ),
  },
  {
    id: "notifications",
    label: "Notifikasi",
    href: "/notifications",
    icon: <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />,
  },
  {
    id: "profile",
    label: "Profil",
    href: "/profile",
    icon: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
  },
];

export function FeedShell({
  activeNav,
  children,
  header,
  rightPanel,
  hideCompose = false,
}: {
  activeNav?: FeedNavItem;
  children: ReactNode;
  header?: ReactNode;
  rightPanel?: ReactNode;
  hideCompose?: boolean;
}) {
  const { user, me } = useMe();
  const name = me?.display_name ?? user?.email?.split("@")[0] ?? "Kamu";
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
  const composeHref = user ? "/community/new" : "/login";

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link className={styles.brand} href="/" aria-label="Peluit, beranda">
          <Image
            alt=""
            className={styles.brandMark}
            height={1313}
            priority
            src="/brand/peluit-mark.png"
            width={882}
          />
          <span className={styles.brandWord}>ELUIT</span>
        </Link>
        <nav aria-label="Navigasi utama" className={styles.navigation}>
          {navigation.map((item) => (
            <Link
              aria-current={activeNav === item.id ? "page" : undefined}
              aria-label={item.label}
              className={`${styles.navLink}${activeNav === item.id ? ` ${styles.active}` : ""}`}
              href={item.href}
              key={item.id}
              title={item.label}
            >
              <svg
                aria-hidden="true"
                fill="none"
                height="21"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.7"
                viewBox="0 0 24 24"
                width="21"
              >
                {item.icon}
              </svg>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        {!hideCompose ? (
          <Link aria-label="Tulis postingan" className={styles.compose} href={composeHref}>
            <span aria-hidden="true" className={styles.composeIcon}>
              +
            </span>
            <span className={styles.composeLabel}>Tulis postingan</span>
          </Link>
        ) : null}
        <Link
          aria-label={user ? undefined : "Login ke Peluit"}
          className={styles.userLink}
          href={user ? "/profile" : "/login"}
        >
          {user ? (
            <>
              <span aria-hidden="true" className={styles.avatar}>
                {initials}
              </span>
              <span className={styles.userLabel}>
                <strong>{name}</strong>
                <small>{user.email}</small>
              </span>
            </>
          ) : (
            <span className={styles.loginButton}>Login</span>
          )}
        </Link>
      </aside>

      <section className={styles.center}>
        {header ? <div className={styles.stickyHeader}>{header}</div> : null}
        {children}
      </section>

      <aside aria-label="Panel samping" className={styles.rightPanel}>
        {rightPanel}
      </aside>
    </div>
  );
}

export function RightPanel({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <section className={styles.panelCard}>
      {title ? <h2>{title}</h2> : null}
      {children}
    </section>
  );
}
