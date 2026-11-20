import { describe, expect, it } from "vitest";
import type { AppContext } from "../../core/context";
import { createFakeSupabase } from "../../../tests/fakeSupabase";
import { createVenuesService } from "./service";

describe("listMine", () => {
  it("mengembalikan semua status milik owner, tidak milik orang lain", async () => {
    const fake = createFakeSupabase({
      venues: [
        { id: "v1", owner_id: "o1", name: "A", address: null, status: "pending", created_at: "2026-01-01" },
        { id: "v2", owner_id: "o1", name: "B", address: null, status: "approved", created_at: "2026-02-01" },
        { id: "v3", owner_id: "o2", name: "C", address: null, status: "approved", created_at: "2026-03-01" },
      ],
      venues_geo: [
        { id: "v1", lat: 1, lng: 2 },
        { id: "v2", lat: 1, lng: 2 },
        { id: "v3", lat: 1, lng: 2 },
      ],
      courts: [{ id: "c1", venue_id: "v1", sport: "futsal", name: "Court 1", price_per_hour: 100_000, active: true }],
    });
    const svc = createVenuesService({ supabase: fake.db } as unknown as AppContext);
    const mine = await svc.listMine({ id: "o1", roles: ["user", "owner"] });
    expect(mine.map((v) => v.id).sort()).toEqual(["v1", "v2"]);
    expect(mine.find((v) => v.id === "v1")).toMatchObject({ status: "pending", courts: [{ id: "c1" }] });
  });
});
