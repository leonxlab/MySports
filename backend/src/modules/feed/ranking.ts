import type { FeedFilters } from "./schema";

export interface FeedSignal {
  kind: "search" | "view_open_play" | "view_thread" | "post_thread" | "join_open_play";
  sport: string | null;
  term: string | null;
}

export interface RankableFeedItem {
  id: string;
  content_type: string;
  content_kind: string;
  sport: string | null;
  format: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  title: string;
  body: string | null;
  created_at: string;
}

export interface RankedFeedItem<T extends RankableFeedItem = RankableFeedItem> {
  item: T;
  score: number;
  distance_km: number | null;
  reasons: string[];
}

const rankingWeights = {
  sportSignal: 12,
  kindSignal: 8,
  searchMatch: 10,
  recentContent: 12,
  nearbyContent: 20,
} as const;

const dayMs = 24 * 60 * 60 * 1000;

export function distanceInKm(
  first: { latitude: number; longitude: number },
  second: { latitude: number; longitude: number },
): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(second.latitude - first.latitude);
  const longitudeDelta = radians(second.longitude - first.longitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(first.latitude)) *
      Math.cos(radians(second.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2;
  const boundedA = Math.min(1, Math.max(0, a));
  return 6371 * 2 * Math.atan2(Math.sqrt(boundedA), Math.sqrt(1 - boundedA));
}

function isWithinRadius(distance: number | null, radius: number | undefined) {
  return radius === undefined || (distance !== null && distance <= radius);
}

function matchesFilters(item: RankableFeedItem, distance: number | null, filters: FeedFilters) {
  if (filters.sport && item.sport !== filters.sport) return false;
  if (filters.content_kind && item.content_kind !== filters.content_kind) return false;
  if (filters.format && item.format !== filters.format) return false;
  return isWithinRadius(distance, filters.radius_km);
}

function normalized(value: string) {
  return value.toLowerCase().trim();
}

export function rankFeedItems<T extends RankableFeedItem>(
  items: T[],
  signals: FeedSignal[],
  location: { latitude: number; longitude: number } | undefined,
  filters: FeedFilters,
  now: number,
): RankedFeedItem<T>[] {
  const sportCounts = new Map<string, number>();
  const kindCounts = new Map<string, number>();
  const searchTerms = new Set<string>();

  for (const signal of signals) {
    if (signal.sport) sportCounts.set(signal.sport, (sportCounts.get(signal.sport) ?? 0) + 1);
    if (signal.kind === "view_thread" || signal.kind === "post_thread") {
      kindCounts.set("thread", (kindCounts.get("thread") ?? 0) + 1);
    }
    if (signal.kind === "view_open_play" || signal.kind === "join_open_play") {
      kindCounts.set("open_play", (kindCounts.get("open_play") ?? 0) + 1);
    }
    if (signal.kind === "search" && signal.term?.trim()) searchTerms.add(normalized(signal.term));
  }

  return items
    .map((item) => {
      const { latitude, longitude } = item;
      const distance =
        location && latitude !== null && longitude !== null
          ? distanceInKm(location, { latitude, longitude })
          : null;
      if (!matchesFilters(item, distance, filters)) return null;

      const reasons: string[] = [];
      let score = 0;
      const sportHits = item.sport ? (sportCounts.get(item.sport) ?? 0) : 0;
      if (sportHits > 0) {
        score += Math.min(sportHits, 3) * rankingWeights.sportSignal;
        reasons.push(`Olahraga ${item.sport} sesuai aktivitasmu`);
      }

      const kindHits = kindCounts.get(item.content_kind) ?? 0;
      if (kindHits > 0) {
        score += Math.min(kindHits, 3) * rankingWeights.kindSignal;
        reasons.push(`Topik ${item.content_kind} sesuai aktivitasmu`);
      }

      const text = normalized(`${item.title} ${item.body ?? ""}`);
      const matchedTerm = [...searchTerms].find((term) => text.includes(term));
      if (matchedTerm) {
        score += rankingWeights.searchMatch;
        reasons.push(`Cocok dengan pencarian "${matchedTerm}"`);
      }

      const ageDays = Math.max(0, now - Date.parse(item.created_at)) / dayMs;
      const recencyScore = rankingWeights.recentContent / (1 + ageDays / 7);
      score += recencyScore;
      reasons.push("Konten terbaru");

      if (distance !== null) {
        const nearbyScore = rankingWeights.nearbyContent / (1 + distance / 25);
        score += nearbyScore;
        reasons.push(`${distance.toFixed(1)} km dari lokasimu`);
      }

      return { item, score, distance_km: distance, reasons };
    })
    .filter((result): result is RankedFeedItem<T> => result !== null)
    .sort(
      (a, b) =>
        b.score - a.score ||
        Date.parse(b.item.created_at) - Date.parse(a.item.created_at) ||
        a.item.id.localeCompare(b.item.id),
    );
}

export const feedRankingWeights = rankingWeights;
