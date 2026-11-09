"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, ErrorNote, formatTimeRange, Loading, rupiah, SPORT_LABEL, useLoad } from "@/modules/payments";
import { SPORTS, type Sport } from "@/modules/venues";
import { openPlayApi } from "../api";

export function OpenPlayList() {
  const [sport, setSport] = useState<Sport | "">("");
  const [date, setDate] = useState("");
  const list = useLoad(
    () => openPlayApi.search({ sport: sport || undefined, date: date || undefined }),
    [sport, date],
  );

  return (
    <>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <label>
          Cabang{" "}
          <select value={sport} onChange={(e) => setSport(e.target.value as Sport | "")}>
            <option value="">Semua</option>
            {SPORTS.map((s) => (
              <option key={s} value={s}>
                {SPORT_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tanggal <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>
      {list.loading && <Loading />}
      <ErrorNote message={list.error} />
      {list.data?.length === 0 && <p>Belum ada open play.</p>}
      {list.data?.map((o) => (
        <Card key={o.id}>
          <Link href={`/open-play/${o.id}`}>
            <strong>
              {SPORT_LABEL[o.sport]} di {o.venueName}
            </strong>
          </Link>
          <div>{formatTimeRange(o.startsAt, o.endsAt)}</div>
          <div>
            {o.confirmed}/{o.quota} peserta · {o.price === 0 ? "Gratis" : rupiah(o.price)}
            {o.status !== "open" && ` · ${o.status}`}
          </div>
        </Card>
      ))}
    </>
  );
}
