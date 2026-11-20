"use client";

import { useState } from "react";
import { Card, ErrorNote, Loading, SPORT_LABEL, useAction } from "@/modules/payments";
import { SPORTS, type Sport } from "@/modules/venues";
import { openPlayApi } from "../api";
import type { MemberDetail, MemberSummary } from "../types";

export function CoachMembers() {
  const [q, setQ] = useState("");
  const [sport, setSport] = useState<Sport | "">("");
  const [results, setResults] = useState<MemberSummary[] | null>(null);
  const [detail, setDetail] = useState<MemberDetail | null>(null);
  const search = useAction();
  const open = useAction();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setDetail(null);
    const r = await search.run(() => openPlayApi.searchMembers(q.trim(), sport || undefined));
    if (r) setResults(r);
  }
  async function show(id: string) {
    const d = await open.run(() => openPlayApi.getMember(id));
    if (d) setDetail(d);
  }

  return (
    <>
      <form onSubmit={submit} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input placeholder="Nama pemain" value={q} onChange={(e) => setQ(e.target.value)} required />
        <select value={sport} onChange={(e) => setSport(e.target.value as Sport | "")} aria-label="Cabang">
          <option value="">Semua cabang</option>
          {SPORTS.map((s) => (
            <option key={s} value={s}>
              {SPORT_LABEL[s]}
            </option>
          ))}
        </select>
        <button type="submit" disabled={search.busy}>
          Cari
        </button>
      </form>
      <ErrorNote message={search.error ?? open.error} />
      {search.busy && <Loading text="Mencari…" />}
      {results?.length === 0 && <p>Tidak ada pemain yang cocok.</p>}
      {results?.map((m) => (
        <Card key={m.id}>
          <strong>{m.displayName}</strong>
          {m.age ? ` · ${m.age} th` : ""}
          {m.level ? ` · Level ${m.level}` : ""}{" "}
          <button type="button" disabled={open.busy} onClick={() => show(m.id)}>
            Lihat info
          </button>
        </Card>
      ))}

      {detail && (
        <Card>
          <h2 style={{ marginTop: 0 }}>{detail.displayName ?? detail.display_name}</h2>
          {detail.age ? <div>Umur {detail.age}</div> : null}
          {detail.bio && <p>{detail.bio}</p>}
          <h3>Pengalaman</h3>
          {detail.experience.length === 0 && <p>Belum diisi.</p>}
          {detail.experience.map((x) => (
            <div key={x.sport}>
              {SPORT_LABEL[x.sport] ?? x.sport}
              {x.years !== null ? `, ${x.years} tahun` : ""}
              {x.notes ? ` · ${x.notes}` : ""}
            </div>
          ))}
          <h3>Galeri</h3>
          {detail.gallery.length === 0 && <p>Belum ada.</p>}
          {detail.gallery.map((g) => (
            <div key={g.id}>{g.kind === "quote" ? `“${g.quote_text ?? ""}”` : `${g.kind}: ${g.storage_path ?? ""}`}</div>
          ))}
        </Card>
      )}
    </>
  );
}
