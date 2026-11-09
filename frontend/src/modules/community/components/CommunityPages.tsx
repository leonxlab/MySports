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
  main: { margin: "0 auto", maxWidth: 820, padding: 24 } as const,
  panel: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    marginTop: 16,
    padding: 20,
  } as const,
  field: { display: "grid", gap: 6, marginBottom: 14 } as const,
  input: {
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    font: "inherit",
    padding: "10px 12px",
  } as const,
  button: {
    background: "#0f172a",
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

function Author({ item }: { item: { author: CommunityThread["author"]; created_at: string } }) {
  return (
    <p style={{ color: "#475569", margin: "0 0 10px" }}>
      {item.author?.display_name ?? "Pemain"} · {new Date(item.created_at).toLocaleString("id-ID")}
    </p>
  );
}

export function CommunityListPage() {
  const { user } = useMe();
  const [sport, setSport] = useState<CommunitySport | "">("");
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

  return (
    <main style={styles.main}>
      <header style={{ alignItems: "center", display: "flex", justifyContent: "space-between" }}>
        <h1>Komunitas</h1>
        {user ? (
          <Link href="/community/new">Buat thread</Link>
        ) : (
          <Link href="/login">Login untuk menulis</Link>
        )}
      </header>
      <label style={styles.field}>
        Filter olahraga
        <select
          onChange={(event) => setSport(event.target.value as CommunitySport | "")}
          style={styles.input}
          value={sport}
        >
          <option value="">Semua olahraga</option>
          {sports.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <ErrorMessage message={error} />
      {loading ? <p role="status">Memuat komunitas...</p> : null}
      {!loading && !error && !page.items.length ? (
        <p>Belum ada thread untuk olahraga ini.</p>
      ) : null}
      {page.items.map((thread) => (
        <article key={thread.id} style={styles.panel}>
          <Author item={thread} />
          <p style={{ color: "#475569" }}>
            {sports.find((item) => item.value === thread.sport)?.label}
          </p>
          <h2 style={{ marginTop: 6 }}>
            <Link href={`/community/${thread.id}`}>{thread.title}</Link>
          </h2>
          {thread.body ? <p style={{ whiteSpace: "pre-wrap" }}>{thread.body}</p> : null}
          <MediaGallery media={thread.media} />
        </article>
      ))}
      {page.next_cursor && !loading ? (
        <button
          disabled={loadingMore}
          onClick={() => void loadMore()}
          style={{ ...styles.button, marginTop: 16 }}
        >
          {loadingMore ? "Memuat..." : "Muat lebih banyak"}
        </button>
      ) : null}
    </main>
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

  if (isLoading || !user)
    return (
      <main style={styles.main}>
        <p role="status">Memeriksa sesi...</p>
      </main>
    );
  return (
    <main style={styles.main}>
      <h1>Buat thread</h1>
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
          {saving ? "Menerbitkan..." : "Terbitkan thread"}
        </button>
      </form>
    </main>
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

  if (loading)
    return (
      <main style={styles.main}>
        <p role="status">Memuat thread...</p>
      </main>
    );
  if (error && !thread)
    return (
      <main style={styles.main}>
        <ErrorMessage message={error} />
      </main>
    );
  if (!thread)
    return (
      <main style={styles.main}>
        <p>Thread tidak ditemukan.</p>
      </main>
    );

  return (
    <main style={styles.main}>
      <Link href="/community">← Kembali ke komunitas</Link>
      <article style={styles.panel}>
        <Author item={thread} />
        <p style={{ color: "#475569" }}>
          {sports.find((item) => item.value === thread.sport)?.label}
        </p>
        <h1>{thread.title}</h1>
        {thread.body ? <p style={{ whiteSpace: "pre-wrap" }}>{thread.body}</p> : null}
        <MediaGallery media={thread.media} />
        {user ? <ReportForm targetId={thread.id} targetType="thread" /> : null}
      </article>
      <section aria-labelledby="replies">
        <h2 id="replies">Balasan ({thread.posts.length})</h2>
        {thread.posts.map((post: CommunityPost) => (
          <article key={post.id} style={styles.panel}>
            <Author item={post} />
            <p style={{ whiteSpace: "pre-wrap" }}>{post.body}</p>
            <MediaGallery media={post.media} />
            {user ? <ReportForm targetId={post.id} targetType="post" /> : null}
          </article>
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
          <p>
            <Link href="/login">Login untuk membalas.</Link>
          </p>
        )}
      </section>
    </main>
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

  if (isLoading)
    return (
      <main style={styles.main}>
        <p role="status">Memeriksa akses...</p>
      </main>
    );
  if (!me?.roles.includes("admin"))
    return (
      <main style={styles.main}>
        <p role="alert">Halaman ini hanya untuk admin.</p>
      </main>
    );

  return (
    <main style={styles.main}>
      <h1>Moderasi komunitas</h1>
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
      {loading ? <p role="status">Memuat laporan...</p> : null}
      {!loading && reports.length === 0 ? <p>Tidak ada laporan pada status ini.</p> : null}
      {reports.map((report) => (
        <article key={report.id} style={styles.panel}>
          <p>
            {report.target_type === "thread" ? "Thread" : "Balasan"} · oleh{" "}
            {report.reporter?.display_name ?? "Pemain"} ·{" "}
            {new Date(report.created_at).toLocaleString("id-ID")}
          </p>
          <p>Alasan: {report.reason || "Tidak disertakan"}</p>
          <div style={{ background: "#f8fafc", borderRadius: 8, padding: 12 }}>
            {report.target?.title ? <strong>{report.target.title}</strong> : null}
            <p style={{ whiteSpace: "pre-wrap" }}>
              {report.target?.body ?? "Konten sudah tidak tersedia."}
            </p>
            {report.target?.media ? <MediaGallery media={report.target.media} /> : null}
          </div>
          {report.status === "open" ? (
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button
                disabled={savingId === report.id}
                onClick={() => void resolve(report, "resolved")}
                style={styles.button}
              >
                Selesaikan
              </button>
              <button
                disabled={savingId === report.id}
                onClick={() => void resolve(report, "dismissed")}
              >
                Tolak laporan
              </button>
            </div>
          ) : null}
        </article>
      ))}
    </main>
  );
}
