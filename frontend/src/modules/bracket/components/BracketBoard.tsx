import { Card } from "@/modules/payments";
import type { BracketView } from "../types";

export type NameMap = Map<string, string>;
export const nameOf = (names: NameMap | undefined, id: string) => names?.get(id) ?? `Pemain ${id.slice(0, 4)}`;

export interface Picked {
  roundId: string;
  id: string;
}

/**
 * Tampilan bracket per ronde. Bila `onPick` diberikan (halaman Coach), nama pemain bisa dipilih
 * untuk alur pilih-lalu-tukar. `renderMatchActions` menambah tombol per match.
 */
export function BracketBoard({
  bracket,
  names,
  picked,
  onPick,
  renderMatchActions,
}: {
  bracket: BracketView;
  names?: NameMap;
  picked?: Picked | null;
  onPick?: (roundId: string, playerId: string) => void;
  renderMatchActions?: (matchId: string) => React.ReactNode;
}) {
  const player = (roundId: string, id: string) => {
    const label = nameOf(names, id);
    if (!onPick) return <span key={id}>{label}</span>;
    const active = picked?.roundId === roundId && picked.id === id;
    return (
      <button
        key={id}
        type="button"
        aria-pressed={active}
        onClick={() => onPick(roundId, id)}
        style={{ margin: "0 2px", fontWeight: active ? 700 : 400, outline: active ? "2px solid" : undefined }}
      >
        {label}
      </button>
    );
  };
  const side = (roundId: string, ids: string[]) =>
    ids.map((id, i) => (
      <span key={id}>
        {i > 0 && " & "}
        {player(roundId, id)}
      </span>
    ));

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
              Lapangan {m.court}: {side(r.id, m.home)} <em>vs</em> {side(r.id, m.away)} {renderMatchActions?.(m.id)}
            </div>
          ))}
          {r.resting.length > 0 && (
            <div style={{ opacity: 0.85 }}>
              Istirahat: {side(r.id, r.resting)}
            </div>
          )}
        </Card>
      ))}
    </>
  );
}
