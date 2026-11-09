"use client";

import { ApiError } from "@/lib/api-client";
import { ErrorNote, Loading, useLoad } from "@/modules/payments";
import { bracketApi } from "../api";
import { BracketBoard } from "./BracketBoard";

/** Jadwal main untuk peserta: hanya baca. */
export function BracketSchedule({ openPlayId }: { openPlayId: string }) {
  const b = useLoad(async () => {
    try {
      return await bracketApi.getByOpenPlay(openPlayId);
    } catch (e) {
      if (e instanceof ApiError && e.code === "BRACKET_NOT_FOUND") return null;
      throw e;
    }
  }, [openPlayId]);

  if (b.loading) return <Loading />;
  if (b.error) return <ErrorNote message={b.error} />;
  if (!b.data) return <p>Jadwal belum dibuat oleh Coach.</p>;
  // TODO(integration): nama pemain belum bisa diambil peserta biasa (endpoint peserta khusus coach).
  return <BracketBoard bracket={b.data} />;
}
