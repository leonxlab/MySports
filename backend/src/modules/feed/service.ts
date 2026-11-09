import type { AppContext } from "../../core/context";
import { AppError } from "../../core/errors";
import {
  type ClassifyContentInput,
  type FeedFilters,
  type RecordSignalInput,
  classifyContentSchema,
  recordSignalSchema,
} from "./schema";
import { distanceInKm, rankFeedItems, type FeedSignal, type RankableFeedItem } from "./ranking";

type Classification = Pick<
  ClassifyContentInput,
  | "content_type"
  | "content_id"
  | "sport"
  | "content_kind"
  | "format"
  | "city"
  | "latitude"
  | "longitude"
  | "level_min"
  | "level_max"
>;

interface CommunityThread {
  id: string;
  sport: NonNullable<ClassifyContentInput["sport"]>;
  title: string;
  body: string | null;
  media: { type: "image" | "video"; path: string; url?: string }[];
  author: { id: string; display_name: string; photo_path: string | null; level: number } | null;
  created_at: string;
}

interface FeedThread extends RankableFeedItem {
  content_type: "thread";
  media: CommunityThread["media"];
  author: CommunityThread["author"];
  level_min: number | null;
  level_max: number | null;
}

const signalHistoryLimit = 200;

function inferFormat(media: CommunityThread["media"]): "text" | "photo" | "video" | null {
  const mediaTypes = new Set(media.map((item) => item.type));
  if (mediaTypes.size > 1) return null;
  if (mediaTypes.has("video")) return "video";
  if (mediaTypes.has("image")) return "photo";
  return "text";
}

export function createFeedService(ctx: AppContext) {
  const { supabase } = ctx;

  async function getClassifications(ids: string[]) {
    if (ids.length === 0) return [];
    const { data, error } = await supabase
      .from("content_classification")
      .select(
        "content_type, content_id, sport, content_kind, format, city, latitude, longitude, level_min, level_max",
      )
      .eq("content_type", "thread")
      .in("content_id", ids);
    if (error) throw error;
    return (data ?? []) as Classification[];
  }

  async function classifyMissingThreads(threads: CommunityThread[], known: Classification[]) {
    const classifiedIds = new Set(known.map((item) => item.content_id));
    const missing = threads.filter((thread) => !classifiedIds.has(thread.id));
    await Promise.all(
      missing.map((thread) =>
        classifyContent({
          content_type: "thread",
          content_id: thread.id,
          sport: thread.sport,
          content_kind: "thread",
          format: inferFormat(thread.media),
        }),
      ),
    );
    return [
      ...known,
      ...missing.map<Classification>((thread) => ({
        content_type: "thread",
        content_id: thread.id,
        sport: thread.sport,
        content_kind: "thread",
        format: inferFormat(thread.media),
      })),
    ];
  }

  async function loadThreads(filters: FeedFilters) {
    // TODO(integration): merge open-play and venue sources when their list APIs are available.
    const { createCommunityApi } = await import("../community");
    const community = createCommunityApi(ctx);
    const page = await community.listThreads({
      limit: filters.limit,
      sport: filters.sport,
      cursor: filters.cursor,
    });
    const classifications = await getClassifications(page.items.map((thread) => thread.id));
    const completedClassifications = await classifyMissingThreads(page.items, classifications);
    const byId = new Map(completedClassifications.map((item) => [item.content_id, item]));
    const threads = page.items.map((thread): FeedThread => {
      const classification = byId.get(thread.id);
      if (!classification) {
        throw new AppError(500, "CLASSIFICATION_MISSING", "Klasifikasi konten tidak tersedia");
      }
      return {
        id: thread.id,
        content_type: "thread",
        content_kind: classification.content_kind,
        sport: classification.sport ?? null,
        format: classification.format ?? null,
        city: classification.city ?? null,
        latitude: classification.latitude ?? null,
        longitude: classification.longitude ?? null,
        title: thread.title,
        body: thread.body,
        created_at: thread.created_at,
        media: thread.media,
        author: thread.author,
        level_min: classification.level_min ?? null,
        level_max: classification.level_max ?? null,
      };
    });
    return { threads, next_cursor: page.next_cursor };
  }

  function filterThreads(
    threads: FeedThread[],
    filters: FeedFilters,
    location?: { latitude: number; longitude: number },
  ) {
    if (filters.radius_km !== undefined && !location) {
      throw new AppError(400, "LOCATION_REQUIRED", "Lokasi wajib diisi untuk filter jarak");
    }
    return threads.filter((item) => {
      if (filters.content_kind && item.content_kind !== filters.content_kind) return false;
      if (filters.format && item.format !== filters.format) return false;
      if (filters.radius_km !== undefined) {
        if (item.latitude === null || item.longitude === null || !location) return false;
        if (
          distanceInKm(location, { latitude: item.latitude, longitude: item.longitude }) >
          filters.radius_km
        ) {
          return false;
        }
      }
      return true;
    });
  }

  async function classifyContent(input: ClassifyContentInput) {
    const classification = classifyContentSchema.parse(input);
    const { data, error } = await supabase
      .from("content_classification")
      .upsert(
        {
          content_type: classification.content_type,
          content_id: classification.content_id,
          sport: classification.sport ?? null,
          content_kind: classification.content_kind,
          format: classification.format ?? null,
          city: classification.city ?? null,
          latitude: classification.latitude ?? null,
          longitude: classification.longitude ?? null,
          level_min: classification.level_min ?? null,
          level_max: classification.level_max ?? null,
        },
        { onConflict: "content_type,content_id" },
      )
      .select(
        "content_type, content_id, sport, content_kind, format, city, latitude, longitude, level_min, level_max",
      )
      .single();
    if (error) throw error;
    return data;
  }

  async function recordSignal(userId: string, input: RecordSignalInput) {
    const signal = recordSignalSchema.parse(input);
    const { data, error } = await supabase
      .from("user_signals")
      .insert({
        user_id: userId,
        kind: signal.kind,
        sport: signal.sport ?? null,
        term: signal.term?.trim().toLowerCase() || null,
        ref_id: signal.ref_id ?? null,
      })
      .select("id, user_id, kind, sport, term, ref_id, created_at")
      .single();
    if (error) throw error;
    return data;
  }

  async function getSignals(userId: string): Promise<FeedSignal[]> {
    const { data, error } = await supabase
      .from("user_signals")
      .select("kind, sport, term")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(signalHistoryLimit);
    if (error) throw error;
    return (data ?? []) as FeedSignal[];
  }

  function locationFrom(filters: FeedFilters) {
    if (filters.latitude === undefined || filters.longitude === undefined) return undefined;
    return { latitude: filters.latitude, longitude: filters.longitude };
  }

  return {
    classifyContent,
    recordSignal,

    async getHomeFeed(userId: string, filters: FeedFilters) {
      const location = locationFrom(filters);
      const [{ threads, next_cursor: nextCursor }, signals] = await Promise.all([
        loadThreads(filters),
        getSignals(userId),
      ]);
      const filtered = filterThreads(threads, filters, location);
      const ranked = rankFeedItems(filtered, signals, location, filters, Date.now());
      const items = ranked.slice(0, filters.limit).map(({ item, score, distance_km, reasons }) => ({
        ...item,
        score,
        distance_km,
        reasons,
      }));
      return { items, next_cursor: nextCursor };
    },

    async getExplore(filters: FeedFilters) {
      const location = locationFrom(filters);
      const { threads, next_cursor: nextCursor } = await loadThreads(filters);
      const filtered = filterThreads(threads, filters, location);
      const items = filtered.slice(0, filters.limit).map((item) => ({
        ...item,
        score: null,
        distance_km:
          location && item.latitude !== null && item.longitude !== null
            ? distanceInKm(location, { latitude: item.latitude, longitude: item.longitude })
            : null,
        reasons: [],
      }));
      return { items, next_cursor: nextCursor };
    },
  };
}

export type FeedService = ReturnType<typeof createFeedService>;
