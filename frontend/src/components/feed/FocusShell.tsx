import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./FocusShell.module.css";

export function FocusShell({
  title,
  exitHref,
  status,
  subtitle,
  children,
  actions,
  backLabel,
  headerAction,
}: {
  title: string;
  exitHref: string;
  status: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
  backLabel?: string;
  headerAction?: ReactNode;
}) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={`${styles.headerInner}${backLabel ? ` ${styles.compactHeaderInner}` : ""}`}>
          <div className={styles.headerStart}>
            {backLabel ? (
              <Link aria-label={backLabel} className={styles.back} href={exitHref}>
                <svg
                  aria-hidden="true"
                  fill="none"
                  height="20"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  width="20"
                >
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </Link>
            ) : null}
            <div className={`${styles.heading}${subtitle ? ` ${styles.headingWithSubtitle}` : ""}`}>
              <h1>{title}</h1>
              {subtitle ? <span className={styles.subtitle}>{subtitle}</span> : null}
              {!headerAction ? (
                <span
                  className={`${styles.status}${status === "Live" ? ` ${styles.liveStatus}` : ""}`}
                >
                  {status}
                </span>
              ) : null}
            </div>
          </div>
          <div className={styles.headerActions}>
            {headerAction ?? (
              <Link className={styles.exit} href={exitHref}>
                Keluar sesi
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className={styles.content}>{children}</main>
      <footer className={styles.actionBar}>
        <div className={`${styles.actionInner}${backLabel ? ` ${styles.compactActionInner}` : ""}`}>
          {actions ?? (
            <Link className={styles.exit} href={exitHref}>
              Kembali
            </Link>
          )}
        </div>
      </footer>
    </div>
  );
}

export { default as focusStyles } from "./FocusShell.module.css";
