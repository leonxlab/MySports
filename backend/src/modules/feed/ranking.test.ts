import { describe, expect, it } from "vitest";
import { feedFiltersSchema } from "./schema";
import { rankFeedItems, type RankableFeedItem } from "./ranking";

const now = Date.parse("2026-11-09T12:00:00.000Z");
const location = { latitude: -6.2, longitude: 106.8 };

function item(overrides: Partial<RankableFeedItem>): RankableFeedItem {
  return {
    id: "123e4567-e89b-12d3-a456-426614174001",
    content_type: "thread",
    content_kind: "thread",
    sport: "basketball",
    format: "text",
    city: "Jakarta",
    latitude: -6.21,
    longitude: 106.81,
    title: "Diskusi basket",
    body: "Pengalaman bermain",
    created_at: "2026-11-09T10:00:00.000Z",
    ...overrides,
  };
}

describe("feed ranking", () => {
  it("menaikkan ranking untuk cabang yang sering dimainkan", () => {
    const items = [
      item({ id: "123e4567-e89b-12d3-a456-426614174001", sport: "basketball" }),
      item({ id: "123e4567-e89b-12d3-a456-426614174002", sport: "padel" }),
    ];
    const ranked = rankFeedItems(
      items,
      [{ kind: "join_open_play", sport: "padel", term: null }],
      location,
      feedFiltersSchema.parse({}),
      now,
    );

    expect(ranked[0].item.sport).toBe("padel");
    expect(ranked[0].reasons).toContain("Olahraga padel sesuai aktivitasmu");
  });

  it("cold start mengutamakan jarak dan kebaruan", () => {
    const nearby = item({
      id: "123e4567-e89b-12d3-a456-426614174001",
      title: "Dekat dan baru",
      created_at: "2026-11-09T11:00:00.000Z",
      latitude: -6.201,
      longitude: 106.801,
    });
    const distant = item({
      id: "123e4567-e89b-12d3-a456-426614174002",
      title: "Jauh dan lama",
      created_at: "2026-10-01T11:00:00.000Z",
      latitude: -7.25,
      longitude: 112.75,
    });
    const ranked = rankFeedItems([distant, nearby], [], location, feedFiltersSchema.parse({}), now);

    expect(ranked.map((result) => result.item.id)).toEqual([nearby.id, distant.id]);
    expect(ranked[0].distance_km).toBeLessThan(ranked[1].distance_km!);
  });

  it("menerapkan filter olahraga, jenis, format, dan radius", () => {
    const matching = item({ id: "123e4567-e89b-12d3-a456-426614174001" });
    const excluded = item({
      id: "123e4567-e89b-12d3-a456-426614174002",
      sport: "padel",
      content_kind: "achievement",
      format: "video",
      latitude: -7.25,
      longitude: 112.75,
    });
    const result = rankFeedItems(
      [matching, excluded],
      [],
      location,
      feedFiltersSchema.parse({
        sport: "basketball",
        content_kind: "thread",
        format: "text",
        latitude: location.latitude,
        longitude: location.longitude,
        radius_km: 20,
      }),
      now,
    );

    expect(result.map((entry) => entry.item.id)).toEqual([matching.id]);
  });

  it("menghasilkan urutan dan skor yang deterministik", () => {
    const input = [
      item({ id: "123e4567-e89b-12d3-a456-426614174002" }),
      item({ id: "123e4567-e89b-12d3-a456-426614174001" }),
    ];
    const filters = feedFiltersSchema.parse({});
    const first = rankFeedItems(input, [], location, filters, now);
    const second = rankFeedItems(input, [], location, filters, now);

    expect(second).toEqual(first);
  });
});
