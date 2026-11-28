import { CoachOpenPlayForm } from "@/modules/open-play";
import Link from "next/link";
import { FeedShell, RightPanel } from "@/components/feed";
import styles from "@/components/feed/FeedPage.module.css";

export default function NewOpenPlayPage() {
  const header = (
    <div className={styles.headerInner}>
      <Link className={styles.inlineMessage} href="/open-play">
        ← Kembali ke open play
      </Link>
      <h1 className={styles.pageTitle}>Buat open play</h1>
    </div>
  );
  return (
    <FeedShell
      activeNav="open-play"
      header={header}
      hideCompose
      rightPanel={
        <RightPanel title="Untuk Coach">
          <p className={styles.muted}>
            Open play hanya dapat dibuat oleh Coach dengan booking lapangan yang sudah
            terkonfirmasi.
          </p>
        </RightPanel>
      }
    >
      <CoachOpenPlayForm />
    </FeedShell>
  );
}
