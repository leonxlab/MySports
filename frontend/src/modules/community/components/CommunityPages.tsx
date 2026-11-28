"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";
import {
  ChipFilter,
  Composer,
  EmptyState,
  FeedShell,
  PostCard,
  RightPanel,
  Skeleton,
  TabBar,
} from "@/components/feed";
import pageStyles from "@/components/feed/FeedPage.module.css";
import { sampleCommunityMembers, sampleCommunityOpenPlays } from "@/modules/feed/sampleData";
import { useMe } from "@/modules/accounts/components/SessionProvider";
import { communityApi } from "../api";
import type {
  CommunityMedia,
  CommunityPost,
  CommunityReport,
  CommunitySport,
  CommunityThread,
  ThreadDetail,
  ThreadPage,
} from "../types";

const sports: { value: CommunitySport; label: string }[] = [
  { value: "basketball", label: "Basket" },
  { value: "badminton", label: "Badminton" },
  { value: "tennis", label: "Tennis" },
  { value: "padel", label: "Padel" },
  { value: "futsal", label: "Futsal" },
];

const styles = {
  panel: {
    background: "var(--feed-panel)",
    border: "1px solid var(--feed-border)",
    borderRadius: 12,
    marginTop: 16,
    padding: 20,
    color: "var(--feed-text)",
  } as const,
  field: { display: "grid", gap: 6, marginBottom: 14 } as const,
  input: {
    border: "1px solid var(--feed-border)",
    borderRadius: 8,
    font: "inherit",
    padding: "10px 12px",
    background: "var(--feed-bg)",
    color: "var(--feed-text)",
  } as const,
  button: {
    background: "var(--color-primary)",
    border: 0,
    borderRadius: 8,
    color: "#fff",
    cursor: "pointer",
    font: "inherit",
    padding: "10px 14px",
  } as const,
};

function ErrorMessage({ message }: { message: string | null }) {
  return message ? (
    <p role="alert" style={{ color: "#b91c1c" }}>
      {message}
    </p>
  ) : null;
}

function MediaGallery({ media }: { media: CommunityMedia[] }) {
  if (!media.length) return null;
  return (
    <div
      style={{
        display: "grid",
        gap: 12,
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
      }}
    >
      {media.map((item) =>
        item.type === "image" ? (
          <img
            alt="Media dari thread komunitas"
            key={item.path}
            src={item.url}
            style={{ borderRadius: 8, maxHeight: 420, maxWidth: "100%", objectFit: "contain" }}
          />
        ) : (
          <video
            aria-label="Video dari thread komunitas"
            controls
            key={item.path}
            src={item.url}
            style={{ borderRadius: 8, maxHeight: 420, maxWidth: "100%" }}
          />
        ),
      )}
    </div>
  );
}

function postMedia(media: CommunityMedia[]) {
  return media.flatMap((item) =>
    item.url
      ? [
          {
            src: item.url,
            alt: "Lampiran postingan komunitas",
            type: item.type,
          },
        ]
      : [],
  );
}

function MediaPicker({
  media,
  onChange,
  onError,
}: {
  media: CommunityMedia[];
  onChange: Dispatch<SetStateAction<CommunityMedia[]>>;
  onError: (message: string | null) => void;
}) {
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [uploading, setUploading] = useState(false);

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return;
    const selected = Array.from(files);
    if (media.length + selected.length > 10) {
      onError("Maksimal 10 file per thread atau balasan.");
      return;
    }

    setUploading(true);
    onError(null);
    try {
      for (const file of selected) {
        setProgress((current) => ({ ...current, [file.name]: 0 }));
        const uploaded = await communityApi.uploadMedia(file, (value) => {
          setProgress((current) => ({ ...current, [file.name]: value }));
        });
        onChange((current) => [...current, uploaded]);
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : "Unggahan media gagal.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={styles.field}>
      <label htmlFor="community-media">Foto/video (maksimal 10 file, 50 MB per file)</label>
      <input
        accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
        disabled={uploading || media.length >= 10}
        id="community-media"
        multiple
        onChange={(event) => {
          void uploadFiles(event.currentTarget.files);
          event.currentTarget.value = "";
        }}
        type="file"
      />
      {Object.entries(progress).map(([name, value]) => (
        <p key={name} role="status">
          {name}: {value}%
        </p>
      ))}
      {media.length ? <p>{media.length} file siap dipasang.</p> : null}
    </div>
  );
}

function ReportForm({ targetType, targetId }: { targetType: "thread" | "post"; targetId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await communityApi.reportContent({ target_type: targetType, target_id: targetId, reason });
      setMessage("Laporan terkirim.");
      setOpen(false);
      setReason("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Laporan gagal dikirim.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <>
        <button onClick={() => setOpen(true)} type="button">
          Laporkan
        </button>
        <ErrorMessage message={message} />
      </>
    );
  }
  return (
    <form onSubmit={submit} style={{ marginTop: 10 }}>
      <label style={styles.field}>
        Alasan laporan
        <textarea
          maxLength={1000}
          onChange={(event) => setReason(event.target.value)}
          required
          rows={3}
          style={styles.input}
          value={reason}
        />
      </label>
      <button disabled={saving} type="submit">
        {saving ? "Mengirim..." : "Kirim laporan"}
      </button>{" "}
      <button disabled={saving} onClick={() => setOpen(false)} type="button">
        Batal
      </button>
      <ErrorMessage message={message} />
    </form>
  );
}

export function CommunityListPage() {
  const { user } = useMe();
  const [sport, setSport] = useState<CommunitySport | "">("");
  const [groupTab, setGroupTab] = useState("posts");
  const [page, setPage] = useState<ThreadPage>({ items: [], next_cursor: null });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadThreads = useCallback(
    async (cursor?: string) => {
      const result = await communityApi.listThreads({
        sport: sport || undefined,
        cursor,
        limit: 25,
      });
      setPage((current) =>
        cursor ? { ...result, items: [...current.items, ...result.items] } : result,
      );
    },
    [sport],
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    communityApi
      .listThreads({ sport: sport || undefined, limit: 25 })
      .then((result) => {
        if (active) setPage(result);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Thread gagal dimuat.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [sport]);

  async function loadMore() {
    if (!page.next_cursor) return;
    setLoadingMore(true);
    setError(null);
    try {
      await loadThreads(page.next_cursor);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Thread selanjutnya gagal dimuat.");
    } finally {
      setLoadingMore(false);
    }
  }

  const header = (
    <div className={pageStyles.headerInner}>
      <div>
        <h1 className={pageStyles.pageTitle}>Komunitas Peluit</h1>
        <p className={pageStyles.inlineMessage}>
          Ruang berbagi untuk pemain dan pencinta olahraga.
        </p>
      </div>
      <TabBar
        label="Bagian komunitas"
        onChange={setGroupTab}
        tabs={[
          { value: "posts", label: "Postingan" },
          { value: "open-play", label: "Open play" },
          { value: "members", label: "Anggota" },
        ]}
        value={groupTab}
      />
      {groupTab === "posts" ? (
        <ChipFilter
          label="Filter olahraga"
          onChange={(value) => setSport(value as CommunitySport | "")}
          options={[{ value: "", label: "Semua" }, ...sports]}
          value={sport}
        />
      ) : null}
    </div>
  );
  const rightPanel = (
    <RightPanel title="Komunitas Peluit">
      <p className={pageStyles.muted}>Berbagi cerita, tips, dan pengalaman olahraga.</p>
      <Link className={pageStyles.panelAction} href={user ? "/community/new" : "/login"}>
        {user ? "Buat postingan" : "Masuk untuk menulis"}
      </Link>
    </RightPanel>
  );

  return (
    <FeedShell activeNav="community" header={header} hideCompose rightPanel={rightPanel}>
      {groupTab === "posts" ? (
        <>
          <Composer
            actionLabel={user ? "Tulis" : "Masuk"}
            href={user ? "/community/new" : "/login"}
            prompt={
              user ? "Bagikan cerita atau pengalaman olahraga..." : "Masuk untuk menulis postingan"
            }
          />
          {error ? <ErrorMessage message={error} /> : null}
          {loading ? <Skeleton rows={3} /> : null}
          {!loading && !error && !page.items.length ? (
            <EmptyState
              title="Belum ada postingan"
              description="Jadilah yang pertama berbagi cerita di komunitas."
              action={
                <Link className={pageStyles.panelAction} href={user ? "/community/new" : "/login"}>
                  {user ? "Buat postingan" : "Masuk untuk menulis"}
                </Link>
              }
            />
          ) : null}
          {page.items.map((thread) => (
            <PostCard
              authorName={thread.author?.display_name ?? "Pemain"}
              body={thread.body}
              key={thread.id}
              media={postMedia(thread.media)}
              replyHref={`/community/${thread.id}`}
              shareUrl={`/community/${thread.id}`}
              sport={sports.find((item) => item.value === thread.sport)?.label}
              time={new Date(thread.created_at).toLocaleString("id-ID")}
              title={thread.title}
            />
          ))}
          {page.next_cursor && !loading ? (
            <button
              className={pageStyles.secondaryAction}
              disabled={loadingMore}
              onClick={() => void loadMore()}
              style={{ margin: 16 }}
              type="button"
            >
              {loadingMore ? "Memuat..." : "Muat lebih banyak"}
            </button>
          ) : null}
        </>
      ) : (
        <>
          <p className={pageStyles.inlineMessage} role="note">
            Data contoh untuk pratinjau; bagian ini belum terhubung ke endpoint komunitas.
          </p>
          {groupTab === "open-play"
            ? sampleCommunityOpenPlays.map((activity) => (
                <PostCard
                  authorName={activity.authorName}
                  body={activity.body}
                  key={activity.id}
                  sport={activity.sport}
                  time={activity.time}
                  title={activity.title}
                />
              ))
            : sampleCommunityMembers.map((member) => (
                <PostCard
                  authorName={member.name}
                  body="Anggota komunitas"
                  key={member.id}
                  sport={member.sport}
                />
              ))}
        </>
      )}
    </FeedShell>
  );
}

export function CreateThreadPage() {
  const { user, isLoading } = useMe();
  const router = useRouter();
  const [sport, setSport] = useState<CommunitySport>("basketball");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [media, setMedia] = useState<CommunityMedia[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, router, user]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const thread = await communityApi.createThread({ sport, title, body, media });
      router.push(`/community/${thread.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Thread gagal dibuat.");
    } finally {
      setSaving(false);
    }
  }

  const header = (
    <div className={pageStyles.headerInner}>
      <Link className={pageStyles.inlineMessage} href="/community">
        ← Kembali ke komunitas
      </Link>
      <h1 className={pageStyles.pageTitle}>Buat postingan</h1>
    </div>
  );
  const rightPanel = (
    <RightPanel title="Bagikan dengan komunitas">
      <p className={pageStyles.muted}>
        Ceritakan pengalaman olahraga dengan tetap menghormati pemain lain.
      </p>
    </RightPanel>
  );

  if (isLoading || !user)
    return (
      <FeedShell activeNav="community" header={header} hideCompose rightPanel={rightPanel}>
        <p className={pageStyles.inlineMessage} role="status">
          Memeriksa sesi...
        </p>
      </FeedShell>
    );
  return (
    <FeedShell activeNav="community" header={header} rightPanel={rightPanel}>
      <form onSubmit={submit} style={styles.panel}>
        <label style={styles.field}>
          Olahraga
          <select
            onChange={(event) => setSport(event.target.value as CommunitySport)}
            style={styles.input}
            value={sport}
          >
            {sports.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label style={styles.field}>
          Judul
          <input
            maxLength={120}
            onChange={(event) => setTitle(event.target.value)}
            required
            style={styles.input}
            value={title}
          />
        </label>
        <label style={styles.field}>
          Cerita atau pengalaman
          <textarea
            maxLength={5000}
            onChange={(event) => setBody(event.target.value)}
            rows={6}
            style={styles.input}
            value={body}
          />
        </label>
        <MediaPicker media={media} onChange={setMedia} onError={setError} />
        <ErrorMessage message={error} />
        <button disabled={saving || media.length > 10} style={styles.button} type="submit">
          {saving ? "Menerbitkan..." : "Terbitkan postingan"}
        </button>
      </form>
    </FeedShell>
  );
}

export function CommunityThreadPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useMe();
  const [thread, setThread] = useState<ThreadDetail | null>(null);
  const [body, setBody] = useState("");
  const [media, setMedia] = useState<CommunityMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadThread = useCallback(async () => {
    const result = await communityApi.getThread(id);
    setThread(result);
  }, [id]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    communityApi
      .getThread(id)
      .then((result) => {
        if (active) setThread(result);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Thread gagal dimuat.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  async function submitPost(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await communityApi.addPost(id, { body, media });
      setBody("");
      setMedia([]);
      await loadThread();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Balasan gagal dikirim.");
    } finally {
      setSaving(false);
    }
  }

  const header = (
    <div className={pageStyles.headerInner}>
      <Link className={pageStyles.inlineMessage} href="/community">
        ← Kembali ke komunitas
      </Link>
      <h1 className={pageStyles.pageTitle}>Thread komunitas</h1>
    </div>
  );
  const rightPanel = (
    <RightPanel title="Komunitas">
      <p className={pageStyles.muted}>Ikuti percakapan dan bagikan pengalaman olahraga.</p>
    </RightPanel>
  );

  if (loading)
    return (
      <FeedShell activeNav="community" header={header} rightPanel={rightPanel}>
        <Skeleton rows={2} />
      </FeedShell>
    );
  if (error && !thread)
    return (
      <FeedShell activeNav="community" header={header} rightPanel={rightPanel}>
        <ErrorMessage message={error} />
      </FeedShell>
    );
  if (!thread)
    return (
      <FeedShell activeNav="community" header={header} rightPanel={rightPanel}>
        <EmptyState title="Thread tidak ditemukan" />
      </FeedShell>
    );

  return (
    <FeedShell activeNav="community" header={header} rightPanel={rightPanel}>
      <PostCard
        authorName={thread.author?.display_name ?? "Pemain"}
        body={thread.body}
        media={postMedia(thread.media)}
        sport={sports.find((item) => item.value === thread.sport)?.label}
        time={new Date(thread.created_at).toLocaleString("id-ID")}
        title={thread.title}
      >
        {user ? <ReportForm targetId={thread.id} targetType="thread" /> : null}
      </PostCard>
      <section aria-labelledby="replies" className={pageStyles.section}>
        <h2 id="replies">Balasan ({thread.posts.length})</h2>
        {thread.posts.map((post: CommunityPost) => (
          <PostCard
            authorName={post.author?.display_name ?? "Pemain"}
            body={post.body}
            key={post.id}
            media={postMedia(post.media)}
            time={new Date(post.created_at).toLocaleString("id-ID")}
          >
            {user ? <ReportForm targetId={post.id} targetType="post" /> : null}
          </PostCard>
        ))}
        {user ? (
          <form onSubmit={submitPost} style={styles.panel}>
            <label style={styles.field}>
              Tulis balasan
              <textarea
                maxLength={5000}
                onChange={(event) => setBody(event.target.value)}
                required
                rows={4}
                style={styles.input}
                value={body}
              />
            </label>
            <MediaPicker media={media} onChange={setMedia} onError={setError} />
            <ErrorMessage message={error} />
            <button disabled={saving} style={styles.button} type="submit">
              {saving ? "Mengirim..." : "Kirim balasan"}
            </button>
          </form>
        ) : (
          <EmptyState
            title="Masuk untuk membalas"
            action={
              <Link className={pageStyles.panelAction} href="/login">
                Masuk
              </Link>
            }
          />
        )}
      </section>
    </FeedShell>
  );
}

export function CommunityReportsPage() {
  const { me, isLoading } = useMe();
  const [status, setStatus] = useState<CommunityReport["status"]>("open");
  const [reports, setReports] = useState<CommunityReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [hideContent, setHideContent] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const result = await communityApi.listReports({ status, limit: 50 });
    setReports(result.items);
  }, [status]);

  useEffect(() => {
    if (isLoading || !me?.roles.includes("admin")) return;
    let active = true;
    setLoading(true);
    setError(null);
    communityApi
      .listReports({ status, limit: 50 })
      .then((result) => {
        if (active) setReports(result.items);
      })
      .catch((cause: unknown) => {
        if (active)
          setError(cause instanceof Error ? cause.message : "Antrean laporan gagal dimuat.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isLoading, me, status]);

  async function resolve(report: CommunityReport, resolution: "resolved" | "dismissed") {
    setSavingId(report.id);
    setError(null);
    try {
      await communityApi.resolveReport(report.id, {
        status: resolution,
        hide_content: hideContent,
      });
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Laporan gagal ditindak.");
    } finally {
      setSavingId(null);
    }
  }

  const header = (
    <div className={pageStyles.headerInner}>
      <h1 className={pageStyles.pageTitle}>Moderasi komunitas</h1>
    </div>
  );
  const rightPanel = (
    <RightPanel title="Moderasi">
      <p className={pageStyles.muted}>
        Tinjau laporan dan tentukan tindak lanjut sesuai kebijakan.
      </p>
    </RightPanel>
  );

  if (isLoading)
    return (
      <FeedShell activeNav="community" header={header} rightPanel={rightPanel}>
        <p className={pageStyles.inlineMessage} role="status">
          Memeriksa akses...
        </p>
      </FeedShell>
    );
  if (!me?.roles.includes("admin"))
    return (
      <FeedShell activeNav="community" header={header} rightPanel={rightPanel}>
        <p className={pageStyles.inlineMessage} role="alert">
          Halaman ini hanya untuk admin.
        </p>
      </FeedShell>
    );

  return (
    <FeedShell activeNav="community" header={header} rightPanel={rightPanel}>
      <label style={styles.field}>
        Status laporan
        <select
          onChange={(event) => setStatus(event.target.value as CommunityReport["status"])}
          style={styles.input}
          value={status}
        >
          <option value="open">Terbuka</option>
          <option value="resolved">Selesai</option>
          <option value="dismissed">Ditolak</option>
        </select>
      </label>
      <label style={{ alignItems: "center", display: "flex", gap: 8 }}>
        <input
          checked={hideContent}
          onChange={(event) => setHideContent(event.target.checked)}
          type="checkbox"
        />
        Sembunyikan konten saat menindak laporan
      </label>
      <ErrorMessage message={error} />
      {loading ? <Skeleton rows={3} /> : null}
      {!loading && reports.length === 0 ? (
        <EmptyState title="Tidak ada laporan pada status ini" />
      ) : null}
      {reports.map((report) => (
        <PostCard
          authorName={report.reporter?.display_name ?? "Pemain"}
          body={
            <>
              <p>Alasan: {report.reason || "Tidak disertakan"}</p>
              {report.target?.title ? <strong>{report.target.title}</strong> : null}
              <p style={{ whiteSpace: "pre-wrap" }}>
                {report.target?.body ?? "Konten sudah tidak tersedia."}
              </p>
              {report.target?.media ? <MediaGallery media={report.target.media} /> : null}
            </>
          }
          key={report.id}
          recommendation={
            report.target_type === "thread" ? "Thread dilaporkan" : "Balasan dilaporkan"
          }
          time={new Date(report.created_at).toLocaleString("id-ID")}
        >
          {report.status === "open" ? (
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button
                disabled={savingId === report.id}
                onClick={() => void resolve(report, "resolved")}
                style={styles.button}
                type="button"
              >
                Selesaikan
              </button>
              <button
                disabled={savingId === report.id}
                onClick={() => void resolve(report, "dismissed")}
                type="button"
              >
                Tolak laporan
              </button>
            </div>
          ) : null}
        </PostCard>
      ))}
    </FeedShell>
  );
}
