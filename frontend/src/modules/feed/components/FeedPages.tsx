"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useMe } from "@/modules/accounts/components/SessionProvider";
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

const sportChips: { value: CommunitySport; label: string }[] = [
  { value: "badminton", label: "Badminton" },
  { value: "futsal", label: "Futsal" },
  { value: "tennis", label: "Tennis" },
  { value: "basketball", label: "Basket" },
  { value: "padel", label: "Padel" },
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

type IconName = "home" | "community" | "bell" | "message" | "profile" | "location" | "comment";

const iconPaths: Record<IconName, ReactNode> = {
  home: (
    <>
      <path d="m3 10 9-7 9 7" />
      <path d="M5 9v11h14V9M9 20v-6h6v6" />
    </>
  ),
  community: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20v-1a6 6 0 0 1 12 0v1M16 5.5a3 3 0 0 1 0 5.8M18 14a5 5 0 0 1 3 5v1" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
    </>
  ),
  message: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  location: (
    <>
      <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  comment: (
    <>
      <path d="M21 11.5a8.5 8.5 0 0 1-9 8.5 9 9 0 0 1-4-.9L3 21l1.5-4A8 8 0 1 1 21 11.5Z" />
    </>
  ),
};

function Icon({ name }: { name: IconName }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="20"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      width="20"
    >
      {iconPaths[name]}
    </svg>
  );
}

interface Location {
  latitude: number;
  longitude: number;
}

function FeedCard({ item, personalized }: { item: FeedItem; personalized: boolean }) {
  const authorName = item.author?.display_name ?? item.city ?? "Komunitas";
  const itemHref = {
    thread: `/community/${item.id}`,
    open_play: `/open-play/${item.id}`,
    venue: `/venues/${item.id}`,
    equipment: `/equipment/${item.id}`,
  }[item.content_type];

  return (
    <PostCard
      authorName={authorName}
      body={item.body}
      media={item.media.flatMap((media) =>
        media.url
          ? [
              {
                src: media.url,
                alt: "Lampiran postingan",
                type: media.type === "image" ? "image" : "video",
              },
            ]
          : [],
      )}
      recommendation={
        personalized && item.reasons.length
          ? `Direkomendasikan karena ${item.reasons.join(", ")}.`
          : undefined
      }
      replyHref={itemHref}
      sport={
        item.sport ? (sports.find((sport) => sport.value === item.sport)?.label ?? item.sport) : ""
      }
      time={new Date(item.created_at).toLocaleString("id-ID", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })}
      title={item.title}
    />
  );
}

function FeedPage({ initialTab, showTabs }: { initialTab: "home" | "explore"; showTabs: boolean }) {
  const { user } = useMe();
  const [tab, setTab] = useState<"home" | "following" | "explore">(initialTab);
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
      return tab === "home" && user ? feedApi.getHomeFeed(filters) : feedApi.getExplore(filters);
    },
    [tab, user],
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
    if (tab === "following") {
      setPage({ items: [], next_cursor: null });
      setLoading(false);
      setError(null);
      return () => {
        active = false;
      };
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

  const header = showTabs ? (
    <>
      <TabBar
        label="Tab beranda"
        onChange={(value) => setTab(value as "home" | "following")}
        tabs={[
          { value: "home", label: "Untuk saya" },
          { value: "following", label: "Mengikuti" },
          { value: "community", label: "Komunitas", href: "/community" },
        ]}
        value={tab}
      />
      <ChipFilter
        label="Filter olahraga"
        onChange={(value) => setSport(value as CommunitySport | "")}
        options={[
          { value: "", label: "Semua olahraga" },
          ...sportChips.map((item) => ({ value: item.value, label: item.label })),
        ]}
        value={sport}
      />
    </>
  ) : (
    <>
      <h1 className="home-explore-heading">Jelajahi olahraga</h1>
      <ChipFilter
        label="Filter olahraga"
        onChange={(value) => setSport(value as CommunitySport | "")}
        options={[
          { value: "", label: "Semua olahraga" },
          ...sportChips.map((item) => ({ value: item.value, label: item.label })),
        ]}
        value={sport}
      />
    </>
  );

  const rightPanel = (
    <>
      <RightPanel title="Filter cepat">
        <label>
          Jenis
          <select
            onChange={(event) => setContentKind(event.target.value as FeedContentKind | "")}
            value={contentKind}
          >
            <option value="">Semua</option>
            {contentKinds.map((kind) => (
              <option key={kind.value} value={kind.value}>
                {kind.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Format
          <select
            onChange={(event) => setFormat(event.target.value as FeedFormat | "")}
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
          Jarak
          <select
            disabled={!location}
            onChange={(event) => setRadius(event.target.value ? Number(event.target.value) : "")}
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
        <button className="home-location-primary" onClick={requestLocation} type="button">
          <Icon name="location" />
          Gunakan lokasi
        </button>
        {location ? (
          <button
            className="home-clear-location"
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
      </RightPanel>
      <RightPanel title="Komunitas untukmu">
        <p>Temukan teman latihan dan diskusi olahraga yang kamu minati.</p>
        <Link className="home-community-link" href="/community">
          Jelajahi komunitas
        </Link>
        <div className="home-community-sports">
          {sportChips.slice(0, 3).map((item) => (
            <button
              className="home-community-sport"
              key={item.value}
              onClick={() => setSport(item.value)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      </RightPanel>
    </>
  );

  return (
    <FeedShell
      activeNav={initialTab === "home" ? "home" : undefined}
      header={header}
      rightPanel={rightPanel}
    >
      <main className="home-main">
        {tab === "home" ? (
          <Composer
            href={user ? "/community/new" : "/login"}
            prompt={
              user
                ? "Lagi cari teman main apa hari ini?"
                : "Login untuk berbagi cerita atau mencari teman main"
            }
          >
            {user ? (
              <button className="home-location-button" onClick={requestLocation} type="button">
                <Icon name="location" />
                Tambah lokasi
              </button>
            ) : null}
          </Composer>
        ) : null}

        {locationMessage ? (
          <p className="home-notice" role="status">
            {locationMessage}
          </p>
        ) : null}
        {tab === "home" && !user ? (
          <p className="home-login-note">
            <Link href="/login">Login untuk melihat feed personal.</Link> Kamu tetap dapat
            menjelajahi olahraga.
          </p>
        ) : null}
        {tab === "following" ? (
          <EmptyState
            description="Feed Mengikuti belum tersedia karena layanan untuk akun yang diikuti belum disediakan."
            title="Belum ada feed Mengikuti"
          />
        ) : null}
        {error ? (
          <p className="home-error" role="alert">
            {error}
          </p>
        ) : null}
        {loading ? <Skeleton /> : null}
        {!loading && !error && !page.items.length && tab !== "following" ? (
          <EmptyState
            description="Coba ubah filter olahraga atau jelajahi postingan terbaru."
            title="Belum ada konten yang cocok"
          />
        ) : null}
        {!loading && tab !== "following" ? (
          <section aria-label="Feed postingan" className="home-feed-list">
            {page.items.map((item) => (
              <FeedCard
                item={item}
                key={`${item.content_type}:${item.id}`}
                personalized={tab === "home" && !!user}
              />
            ))}
          </section>
        ) : null}
        {page.next_cursor && !loading && tab !== "following" ? (
          <button
            className="home-load-more"
            disabled={loadingMore}
            onClick={() => void loadMore()}
            type="button"
          >
            {loadingMore ? "Memuat…" : "Muat lebih banyak"}
          </button>
        ) : null}
        <p className="home-footnote">
          Feed saat ini menampilkan thread komunitas. Integrasi open play dan lapangan menunggu API
          sumber dari pemilik modulnya.
        </p>
      </main>
    </FeedShell>
  );
}

export function HomeFeedPage() {
  return <FeedPage initialTab="home" showTabs />;
}

export function ExploreFeedPage() {
  return <FeedPage initialTab="explore" showTabs={false} />;
}
