import Link from "next/link";
import { FeedShell, RightPanel } from "@/components/feed";
import styles from "@/components/feed/FeedPage.module.css";
import { OwnerVenueForm } from "@/modules/venues";

export default function NewVenuePage() {
  const header = (
    <div className={styles.headerInner}>
      <Link className={styles.inlineMessage} href="/owner/venues">
        ← Kembali ke lapangan saya
      </Link>
      <h1 className={styles.pageTitle}>Daftarkan lapangan</h1>
    </div>
  );
  const rightPanel = (
    <>
      <RightPanel title="Alur pendaftaran">
        <ol>
          <li>Isi data dan titik lokasi lapangan.</li>
          <li>Admin meninjau pengajuan.</li>
          <li>Lapangan tampil setelah disetujui.</li>
        </ol>
      </RightPanel>
      <RightPanel title="Tips lokasi">
        <p className={styles.muted}>
          Cari alamat, tandai langsung pada peta, atau gunakan lokasi perangkat saat berada di
          lapangan.
        </p>
      </RightPanel>
    </>
  );

  return (
    <FeedShell activeNav="venues" header={header} hideCompose rightPanel={rightPanel}>
      <OwnerVenueForm />
    </FeedShell>
  );
}
