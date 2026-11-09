import { Card } from "@/modules/payments";
import type { BracketView } from "../types";

export type NameMap = Map<string, string>;
export const nameOf = (names: NameMap | undefined, id: string) => names?.get(id) ?? `Pemain ${id.slice(0, 4)}`;

/** Tampilan bracket per ronde. `renderMatchActions` dipakai halaman Coach untuk tombol koreksi dan buat match. */
export function BracketBoard({
  bracket,
  names,
  renderMatchActions,
}: {
  bracket: BracketView;
  names?: NameMap;
  renderMatchActions?: (matchId: string) => React.ReactNode;
}) {
  const list = (ids: string[]) => ids.map((id) => nameOf(names, id)).join(" & ");
  return (
    <>
      <p>
        {bracket.rounds.length} ronde · {bracket.courtCount} lapangan · {bracket.matchMinutes} menit/ronde
        {bracket.breakMinutes > 0 ? ` + jeda ${bracket.breakMinutes} menit` : ""} · versi {bracket.version}
      </p>
      {bracket.rounds.map((r) => (
        <Card key={r.id}>
          <strong>Ronde {r.round}</strong>
          {r.matches.map((m) => (
            <div key={m.id} style={{ margin: "6px 0" }}>
              Lapangan {m.court}: {list(m.home)} <em>vs</em> {list(m.away)} {renderMatchActions?.(m.id)}
            </div>
          ))}
          {r.resting.length > 0 && <div style={{ opacity: 0.7 }}>Istirahat: {list(r.resting)}</div>}
        </Card>
      ))}
    </>
  );
}
