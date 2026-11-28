"use client";

import Link from "next/link";
import { useState } from "react";
import { EmptyState, FeedShell, PostCard, RightPanel, StatusPill, TabBar } from "@/components/feed";
import styles from "@/components/feed/FeedPage.module.css";
import { useMe } from "@/modules/accounts/components/SessionProvider";
import type { LoanStatus, SampleEquipmentPost, SampleLoanRequest } from "@/modules/feed/sampleData";
import { sampleEquipmentPosts } from "@/modules/feed/sampleData";

type FeedFilter = "all" | "offer" | "request";

function updateRequest(
  posts: SampleEquipmentPost[],
  postId: string,
  requestId: string,
  status: SampleLoanRequest["status"],
) {
  return posts.map((post) =>
    post.id === postId
      ? {
          ...post,
          status: status === "Dipinjam" ? "Dipinjam" : post.status,
          requests: post.requests.map((request) =>
            request.id === requestId ? { ...request, status } : request,
          ),
        }
      : post,
  );
}

export function EquipmentFeed({
  mode = "all",
  itemId,
}: {
  mode?: "all" | "mine" | "detail";
  itemId?: string;
}) {
  const { user } = useMe();
  const [filter, setFilter] = useState<FeedFilter>("all");
  const [posts, setPosts] = useState(sampleEquipmentPosts);
  const [notice, setNotice] = useState<string | null>(null);
  const title =
    mode === "mine" ? "Alat saya" : mode === "detail" ? "Detail alat" : "Peminjaman alat";

  const visiblePosts = posts.filter((post) => {
    if (mode === "mine" && !post.isOwnPost) return false;
    if (mode === "detail" && post.id !== itemId) return false;
    return filter === "all" || post.kind === filter;
  });

  function setPostStatus(id: string, status: LoanStatus) {
    setPosts((current) => current.map((post) => (post.id === id ? { ...post, status } : post)));
    setNotice("Status berubah di pratinjau ini saja; belum tersimpan ke server.");
  }

  function setRequestStatus(
    postId: string,
    requestId: string,
    status: SampleLoanRequest["status"],
  ) {
    setPosts((current) => updateRequest(current, postId, requestId, status));
    setNotice("Tanggapan berubah di pratinjau ini saja; belum tersimpan ke server.");
  }

  const header = (
    <div className={styles.headerInner}>
      <h1 className={styles.pageTitle}>{title}</h1>
      {mode === "all" ? (
        <TabBar
          label="Jenis postingan alat"
          onChange={(value) => setFilter(value as FeedFilter)}
          tabs={[
            { value: "all", label: "Semua" },
            { value: "offer", label: "Tawarkan alat" },
            { value: "request", label: "Cari pinjaman" },
          ]}
          value={filter}
        />
      ) : null}
    </div>
  );
  const rightPanel = (
    <>
      <RightPanel title="Bagikan alat">
        <p className={styles.muted}>
          Tawarkan alat atau lihat permintaan pinjaman dari pemain lain.
        </p>
        <Link className={styles.panelAction} href="/equipment/new">
          Tawarkan alat
        </Link>
      </RightPanel>
      <RightPanel title="Tentang data ini">
        <p className={styles.muted}>
          Kartu di halaman ini adalah contoh tampilan, bukan penawaran aktif.
        </p>
      </RightPanel>
    </>
  );

  return (
    <FeedShell activeNav="equipment" header={header} rightPanel={rightPanel}>
      <p className={styles.inlineMessage} role="note">
        Data contoh: endpoint peminjaman alat masih belum tersedia. Aksi di halaman ini hanya
        pratinjau dan tidak mengirim permintaan.
      </p>
      {notice ? (
        <p className={styles.inlineMessage} role="status">
          {notice}
        </p>
      ) : null}
      {!visiblePosts.length ? (
        <EmptyState
          description="Belum ada contoh yang cocok untuk tampilan ini."
          title="Tidak ada postingan alat"
        />
      ) : null}
      {visiblePosts.map((post) => (
        <EquipmentPost
          key={post.id}
          onChat={() => setNotice("Chat belum tersedia untuk peminjaman alat.")}
          onRequest={() => setPostStatus(post.id, "Diajukan")}
          onRequestStatus={(requestId, status) => setRequestStatus(post.id, requestId, status)}
          post={post}
          userIsLoggedIn={Boolean(user)}
        />
      ))}
    </FeedShell>
  );
}

function EquipmentPost({
  post,
  userIsLoggedIn,
  onRequest,
  onRequestStatus,
  onChat,
}: {
  post: SampleEquipmentPost;
  userIsLoggedIn: boolean;
  onRequest: () => void;
  onRequestStatus: (id: string, status: SampleLoanRequest["status"]) => void;
  onChat: () => void;
}) {
  const title = `${post.kind === "offer" ? "Tawarkan alat" : "Cari pinjaman"} · ${post.itemName}`;
  return (
    <PostCard
      authorName={post.authorName}
      body={
        post.kind === "offer"
          ? "Menawarkan alat untuk dipinjam."
          : "Sedang mencari alat untuk dipinjam."
      }
      replyHref={`/equipment/${post.id}`}
      sport={post.sport}
      title={title}
    >
      <StatusPill status={post.status} />
      <div className={styles.detailGrid}>
        <div>
          <strong>Kondisi</strong>
          {post.condition}
        </div>
        <div>
          <strong>Jumlah</strong>
          {post.quantity}
        </div>
        <div>
          <strong>Periode</strong>
          {post.period}
        </div>
        <div>
          <strong>Lokasi</strong>
          {post.location}
        </div>
        <div>
          <strong>Biaya</strong>
          {post.price ? `Rp ${post.price.toLocaleString("id-ID")}` : "Gratis"}
        </div>
        <div>
          <strong>Deposit</strong>
          {post.deposit ? `Rp ${post.deposit.toLocaleString("id-ID")}` : "Tidak ada"}
        </div>
      </div>
      <div className={styles.cardActions}>
        {post.kind === "offer" && post.status === "Tersedia" && !post.isOwnPost ? (
          userIsLoggedIn ? (
            <button className={styles.primaryAction} onClick={onRequest} type="button">
              Ajukan pinjam
            </button>
          ) : (
            <Link className={styles.primaryAction} href="/login">
              Masuk untuk mengajukan
            </Link>
          )
        ) : post.kind === "request" ? (
          <Link className={styles.primaryAction} href="/equipment/new">
            Tawarkan alat
          </Link>
        ) : null}
        {userIsLoggedIn ? (
          <button className={styles.secondaryAction} onClick={onChat} type="button">
            Chat
          </button>
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
              {request.status === "Diajukan" && post.isOwnPost && userIsLoggedIn ? (
                <>
                  <button
                    className={styles.primaryAction}
                    onClick={() => onRequestStatus(request.id, "Dipinjam")}
                    type="button"
                  >
                    Setujui
                  </button>
                  <button
                    className={styles.secondaryAction}
                    onClick={() => onRequestStatus(request.id, "Ditolak")}
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
