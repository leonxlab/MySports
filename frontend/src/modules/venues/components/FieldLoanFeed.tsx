"use client";

import Link from "next/link";
import { useState } from "react";
import { EmptyState, FeedShell, PostCard, RightPanel, StatusPill, TabBar } from "@/components/feed";
import styles from "@/components/feed/FeedPage.module.css";
import { useMe } from "@/modules/accounts/components/SessionProvider";
import type { LoanStatus, SampleLoanRequest, SampleVenueLoanPost } from "@/modules/feed/sampleData";
import { sampleVenueLoanPosts } from "@/modules/feed/sampleData";

type LoanFilter = "all" | "Tersedia" | "Diajukan" | "Dipinjam";

export function FieldLoanFeed() {
  const { user, me } = useMe();
  const [filter, setFilter] = useState<LoanFilter>("all");
  const [posts, setPosts] = useState(sampleVenueLoanPosts);
  const [notice, setNotice] = useState<string | null>(null);
  const isOwner = Boolean(user && me?.roles.includes("owner"));
  const visiblePosts = posts.filter((post) => filter === "all" || post.status === filter);
  const header = (
    <div className={styles.headerInner}>
      <h1 className={styles.pageTitle}>Peminjaman lapangan</h1>
      <TabBar
        label="Filter status peminjaman lapangan"
        onChange={(value) => setFilter(value as LoanFilter)}
        tabs={[
          { value: "all", label: "Semua" },
          { value: "Tersedia", label: "Tersedia" },
          { value: "Diajukan", label: "Diajukan" },
          { value: "Dipinjam", label: "Dipinjam" },
        ]}
        value={filter}
      />
    </div>
  );
  const rightPanel = (
    <>
      <RightPanel title="Cara meminjam">
        <p className={styles.muted}>
          Ajukan jadwal, tunggu persetujuan pemilik, lalu pantau statusnya.
        </p>
        <Link className={styles.panelAction} href="/venues">
          Cari lapangan
        </Link>
      </RightPanel>
      <RightPanel title="Tentang data ini">
        <p className={styles.muted}>Permintaan pada halaman ini adalah contoh pratinjau.</p>
      </RightPanel>
    </>
  );

  function applyForLoan(id: string) {
    setPosts((current) =>
      current.map((post) => (post.id === id ? { ...post, status: "Diajukan" } : post)),
    );
    setNotice("Permintaan berubah di pratinjau ini saja; belum tersimpan ke server.");
  }

  function respondToRequest(
    postId: string,
    requestId: string,
    status: SampleLoanRequest["status"],
  ) {
    setPosts((current) =>
      current.map((post) =>
        post.id === postId
          ? {
              ...post,
              status:
                status === "Dipinjam"
                  ? "Dipinjam"
                  : status === "Ditolak"
                    ? "Tersedia"
                    : post.status,
              requests: post.requests.map((request) =>
                request.id === requestId ? { ...request, status } : request,
              ),
            }
          : post,
      ),
    );
    setNotice("Tanggapan berubah di pratinjau ini saja; belum tersimpan ke server.");
  }

  return (
    <FeedShell activeNav="venues" header={header} rightPanel={rightPanel}>
      <p className={styles.inlineMessage} role="note">
        Data contoh: alur persetujuan peminjaman lapangan belum memiliki endpoint. Tombol di sini
        hanya mengubah status pratinjau.
      </p>
      {notice ? (
        <p className={styles.inlineMessage} role="status">
          {notice}
        </p>
      ) : null}
      {!visiblePosts.length ? <EmptyState title="Belum ada permintaan dengan status ini" /> : null}
      {visiblePosts.map((post) => (
        <VenueLoanCard
          isOwner={isOwner}
          key={post.id}
          onApply={() => applyForLoan(post.id)}
          onRespond={(requestId, status) => respondToRequest(post.id, requestId, status)}
          post={post}
          userIsLoggedIn={Boolean(user)}
        />
      ))}
    </FeedShell>
  );
}

function VenueLoanCard({
  post,
  userIsLoggedIn,
  isOwner,
  onApply,
  onRespond,
}: {
  post: SampleVenueLoanPost;
  userIsLoggedIn: boolean;
  isOwner: boolean;
  onApply: () => void;
  onRespond: (requestId: string, status: SampleLoanRequest["status"]) => void;
}) {
  return (
    <PostCard
      authorName={post.authorName}
      body={`${post.venueName} · ${post.courtName}`}
      replyHref="/venues/loans"
      sport={post.sport}
      title={`Peminjaman lapangan · ${post.venueName}`}
    >
      <StatusPill status={post.status} />
      <div className={styles.detailGrid}>
        <div>
          <strong>Jadwal</strong>
          {post.period}
        </div>
        <div>
          <strong>Lokasi</strong>
          {post.location}
        </div>
        <div>
          <strong>Tarif</strong>
          Rp {post.pricePerHour.toLocaleString("id-ID")}/jam
        </div>
        <div>
          <strong>Deposit</strong>
          {post.deposit ? `Rp ${post.deposit.toLocaleString("id-ID")}` : "Tidak ada"}
        </div>
      </div>
      <div className={styles.cardActions}>
        {post.status === "Tersedia" && !post.isOwnPost ? (
          userIsLoggedIn ? (
            <button className={styles.primaryAction} onClick={onApply} type="button">
              Ajukan pinjam
            </button>
          ) : (
            <Link className={styles.primaryAction} href="/login">
              Masuk untuk mengajukan
            </Link>
          )
        ) : null}
        {post.isOwnPost && userIsLoggedIn ? (
          <span className={styles.muted}>Permintaan ini milikmu.</span>
        ) : null}
      </div>
      {post.requests.length ? (
        <section className={styles.section}>
          <h2>Permintaan pinjam</h2>
          {post.requests.map((request) => (
            <div className={styles.cardActions} key={request.id}>
              <span className={styles.muted}>
                {request.requester} · {request.requestedAt} · {request.status}
              </span>
              {request.status === "Diajukan" && post.isOwnPost && isOwner ? (
                <>
                  <button
                    className={styles.primaryAction}
                    onClick={() => onRespond(request.id, "Dipinjam")}
                    type="button"
                  >
                    Setujui
                  </button>
                  <button
                    className={styles.secondaryAction}
                    onClick={() => onRespond(request.id, "Ditolak")}
                    type="button"
                  >
                    Tolak
                  </button>
                </>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}
    </PostCard>
  );
}
