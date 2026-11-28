"use client";

import { useState } from "react";
import { FeedShell, RightPanel } from "./FeedShell";
import componentStyles from "./FeedComponents.module.css";
import styles from "./FeedPage.module.css";
import { sampleNotifications } from "@/modules/feed/sampleData";

const icons = {
  balasan: "↩",
  suka: "♡",
  "open-play": "◉",
  lapangan: "⌂",
} as const;

export function NotificationsPage() {
  const [notifications, setNotifications] = useState(sampleNotifications);
  const unreadCount = notifications.filter((notification) => notification.unread).length;
  const header = (
    <div className={styles.headerInner}>
      <h1 className={styles.pageTitle}>Notifikasi</h1>
    </div>
  );
  const rightPanel = (
    <RightPanel title="Aktivitas">
      <p className={styles.muted}>{unreadCount} notifikasi belum dibaca.</p>
    </RightPanel>
  );

  function markRead(id: string) {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id ? { ...notification, unread: false } : notification,
      ),
    );
  }

  return (
    <FeedShell activeNav="notifications" header={header} rightPanel={rightPanel}>
      <p className={styles.inlineMessage} role="note">
        Data contoh: notifikasi belum memiliki endpoint. Status baca hanya tersimpan di pratinjau
        ini.
      </p>
      {notifications.map((notification) => (
        <button
          aria-label={`${notification.unread ? "Tandai sudah dibaca: " : ""}${notification.text}`}
          className={`${componentStyles.notificationRow}${notification.unread ? ` ${componentStyles.unread}` : ""}`}
          key={notification.id}
          onClick={() => markRead(notification.id)}
          type="button"
        >
          <span aria-hidden="true" className={componentStyles.notificationIcon}>
            {icons[notification.kind]}
          </span>
          <span className={componentStyles.notificationText}>
            <span>{notification.text}</span>
            <time>{notification.time}</time>
          </span>
          {notification.unread ? (
            <span aria-label="Belum dibaca" className={componentStyles.unreadDot} />
          ) : null}
        </button>
      ))}
    </FeedShell>
  );
}
