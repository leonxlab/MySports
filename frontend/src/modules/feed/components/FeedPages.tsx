"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useMe } from "@/modules/accounts/components/SessionProvider";
import { feedApi } from "../api";
import type { FeedContentKind, FeedFilters, FeedFormat, FeedItem, FeedPage } from "../types";
import type { CommunitySport } from "@/modules/community/types";

const sports: { value: CommunitySport; label: string }[] = [
  { value: "basketball", label: "Basket" },
  { value: "badminton", label: "Badminton" },
  { value: "tennis", label: "Tennis" },
  { value: "padel", label: "Padel" },
  { value: "futsal", label: "Futsal" },
];

const contentKinds: { value: FeedContentKind; label: string }[] = [
  { value: "open_play", label: "Open play" },
  { value: "venue", label: "Lapangan" },
  { value: "equipment", label: "Sewa alat" },
  { value: "thread", label: "Thread" },
  { value: "achievement", label: "Pencapaian" },
  { value: "score", label: "Skor" },
];

const formats: { value: FeedFormat; label: string }[] = [
  { value: "text", label: "Teks" },
  { value: "photo", label: "Foto" },
  { value: "video", label: "Video" },
];

const styles = {
  main: { margin: "0 auto", maxWidth: 900, padding: 24 } as const,
  panel: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    marginTop: 16,
    padding: 20,
  } as const,
  input: {
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    font: "inherit",
    padding: "9px 10px",
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

interface Location {
  latitude: number;
  longitude: number;
}

function FeedCard({ item, personalized }: { item: FeedItem; personalized: boolean }) {
  return (
    <article style={styles.panel}>
      <header style={{ alignItems: "center", display: "flex", justifyContent: "space-between" }}>
        <p style={{ color: "#475569", margin: 0 }}>
          {item.author?.display_name ?? item.city ?? "Komunitas"}
          {item.sport
            ? ` · ${sports.find((sport) => sport.value === item.sport)?.label ?? item.sport}`
            : ""}
        </p>
        <time dateTime={item.created_at}>
          {new Date(item.created_at).toLocaleDateString("id-ID")}
        </time>
      </header>
      <p style={{ color: "#475569", marginBottom: 4 }}>
        {contentKinds.find((kind) => kind.value === item.content_kind)?.label ?? item.content_kind}
        {item.distance_km === null ? "" : ` · ${item.distance_km.toFixed(1)} km`}
      </p>
      <h2 style={{ marginTop: 4 }}>
        {item.content_type === "thread" ? (
          <Link href={`/community/${item.id}`}>{item.title}</Link>
        ) : (
          item.title
        )}
      </h2>
      {item.body ? <p style={{ whiteSpace: "pre-wrap" }}>{item.body}</p> : null}
      {item.media.length ? (
        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          }}
        >
          {item.media.map((media) =>
            media.type === "image" ? (
              <img
                alt="Media dari feed"
                key={media.path}
                src={media.url}
                style={{ borderRadius: 8, maxHeight: 420, maxWidth: "100%", objectFit: "contain" }}
              />
            ) : (
              <video
                aria-label="Video dari feed"
                controls
                key={media.path}
                src={media.url}
                style={{ borderRadius: 8, maxHeight: 420, maxWidth: "100%" }}
              />
            ),
          )}
        </div>
      ) : null}
      {personalized && item.reasons.length ? (
        <p style={{ color: "#475569" }}>Kenapa ditampilkan: {item.reasons.join("; ")}</p>
      ) : null}
    </article>
  );
}

function FeedPage({ initialTab, showTabs }: { initialTab: "home" | "explore"; showTabs: boolean }) {
  const { user } = useMe();
  const [tab, setTab] = useState<"home" | "explore">(initialTab);
  const [sport, setSport] = useState<CommunitySport | "">("");
  const [contentKind, setContentKind] = useState<FeedContentKind | "">("");
  const [format, setFormat] = useState<FeedFormat | "">("");
  const [radius, setRadius] = useState<number | "">("");
  const [location, setLocation] = useState<Location | null>(null);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [page, setPage] = useState<FeedPage>({ items: [], next_cursor: null });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(
    async (filters: FeedFilters) => {
      return tab === "home" ? feedApi.getHomeFeed(filters) : feedApi.getExplore(filters);
    },
    [tab],
  );

  const makeFilters = useCallback(
    (cursor?: string): FeedFilters => ({
      sport: sport || undefined,
      content_kind: contentKind || undefined,
      format: format || undefined,
      latitude: location?.latitude,
      longitude: location?.longitude,
      radius_km: radius || undefined,
      limit: 25,
      cursor,
    }),
    [contentKind, format, location, radius, sport],
  );

  useEffect(() => {
    let active = true;
    if (tab === "home" && !user) {
      setLoading(false);
      setPage({ items: [], next_cursor: null });
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    loadPage(makeFilters())
      .then((result) => {
        if (active) setPage(result);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Feed gagal dimuat.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadPage, makeFilters, tab, user]);

  async function loadMore() {
    if (!page.next_cursor) return;
    setLoadingMore(true);
    setError(null);
    try {
      const result = await loadPage(makeFilters(page.next_cursor));
      setPage((current) => ({ ...result, items: [...current.items, ...result.items] }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Feed selanjutnya gagal dimuat.");
    } finally {
      setLoadingMore(false);
    }
  }

  function requestLocation() {
    setLocationMessage(null);
    if (!navigator.geolocation) {
      setRadius("");
      setLocationMessage(
        "Browser ini tidak mendukung lokasi. Feed tetap dapat digunakan tanpa lokasi.",
      );
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationMessage(
          "Lokasi digunakan untuk hasil feed ini dan tidak ditulis ke riwayat sinyal.",
        );
      },
      (cause) => {
        setRadius("");
        setLocationMessage(
          cause.code === cause.PERMISSION_DENIED
            ? "Izin lokasi ditolak. Feed tetap dapat digunakan tanpa lokasi."
            : "Lokasi tidak tersedia. Feed tetap dapat digunakan tanpa lokasi.",
        );
        setLocation(null);
      },
      { enableHighAccuracy: false, maximumAge: 300_000, timeout: 10_000 },
    );
  }

  return (
    <main style={styles.main}>
      <header style={{ alignItems: "center", display: "flex", justifyContent: "space-between" }}>
        <h1>{showTabs ? "Open Play" : "Jelajahi"}</h1>
        <Link href="/community">Komunitas</Link>
      </header>
      {showTabs ? (
        <nav aria-label="Jenis feed" style={{ display: "flex", gap: 8 }}>
          <button
            aria-pressed={tab === "home"}
            onClick={() => setTab("home")}
            style={tab === "home" ? styles.button : undefined}
            type="button"
          >
            Let me choose for you
          </button>
          <button
            aria-pressed={tab === "explore"}
            onClick={() => setTab("explore")}
            style={tab === "explore" ? styles.button : undefined}
            type="button"
          >
            Semua olahraga
          </button>
        </nav>
      ) : null}
      <section
        aria-label="Filter feed"
        style={{ ...styles.panel, display: "flex", flexWrap: "wrap", gap: 12 }}
      >
        <label>
          Olahraga{" "}
          <select
            onChange={(event) => setSport(event.target.value as CommunitySport | "")}
            style={styles.input}
            value={sport}
          >
            <option value="">Semua</option>
            {sports.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Jenis{" "}
          <select
            onChange={(event) => setContentKind(event.target.value as FeedContentKind | "")}
            style={styles.input}
            value={contentKind}
          >
            <option value="">Semua</option>
            {contentKinds.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Format{" "}
          <select
            onChange={(event) => setFormat(event.target.value as FeedFormat | "")}
            style={styles.input}
            value={format}
          >
            <option value="">Semua</option>
            {formats.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Jarak{" "}
          <select
            disabled={!location}
            onChange={(event) => setRadius(event.target.value ? Number(event.target.value) : "")}
            style={styles.input}
            value={radius}
          >
            <option value="">Semua jarak</option>
            {[10, 25, 50, 100].map((distance) => (
              <option key={distance} value={distance}>
                {distance} km
              </option>
            ))}
          </select>
        </label>
        <button onClick={requestLocation} type="button">
          Gunakan lokasi
        </button>
        {location ? (
          <button
            onClick={() => {
              setLocation(null);
              setRadius("");
              setLocationMessage("Lokasi dihapus dari tampilan ini.");
            }}
            type="button"
          >
            Hapus lokasi
          </button>
        ) : null}
      </section>
      {locationMessage ? <p role="status">{locationMessage}</p> : null}
      {tab === "home" && !user ? (
        <p>
          <Link href="/login">Login untuk melihat feed personal.</Link> Kamu tetap dapat menjelajahi
          semua olahraga.
        </p>
      ) : null}
      {error ? (
        <p role="alert" style={{ color: "#b91c1c" }}>
          {error}
        </p>
      ) : null}
      {loading ? <p role="status">Memuat feed...</p> : null}
      {!loading && !error && !page.items.length ? (
        <p>Belum ada konten yang cocok dengan filter ini.</p>
      ) : null}
      {page.items.map((item) => (
        <FeedCard
          item={item}
          key={`${item.content_type}:${item.id}`}
          personalized={tab === "home"}
        />
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
      <p style={{ color: "#64748b", fontSize: 13, marginTop: 20 }}>
        Feed saat ini menampilkan thread komunitas. Integrasi open play dan lapangan menunggu API
        sumber dari pemilik modulnya.
      </p>
    </main>
  );
}

export function HomeFeedPage() {
  return <FeedPage initialTab="home" showTabs />;
}

export function ExploreFeedPage() {
  return <FeedPage initialTab="explore" showTabs={false} />;
}
