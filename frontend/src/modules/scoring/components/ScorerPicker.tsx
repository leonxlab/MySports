import type { PlayerOption, Team } from "../types";

interface Props {
  /** Sisi yang sedang menyerang: daftar yang tampil adalah pemain sisi ini (proposal: Aturan per cabang, basket). */
  attacking: Team;
  home: PlayerOption[];
  away: PlayerOption[];
  value: string | null;
  onChange: (playerId: string | null) => void;
  onAttackingChange?: (team: Team) => void;
}

/** Pilih pemain pencetak skor. Dipasang di halaman control menu match (milik modul match). */
export function ScorerPicker({ attacking, home, away, value, onChange, onAttackingChange }: Props) {
  const players = attacking === "home" ? home : away;
  return (
    <fieldset>
      <legend>Pencetak skor</legend>
      {onAttackingChange && (
        <div role="radiogroup" aria-label="Sisi menyerang" style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          {(["home", "away"] as const).map((t) => (
            <button key={t} type="button" aria-pressed={attacking === t} onClick={() => onAttackingChange(t)}>
              {t === "home" ? "Home menyerang" : "Away menyerang"}
            </button>
          ))}
        </div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button type="button" aria-pressed={value === null} onClick={() => onChange(null)}>
          Tanpa pencetak
        </button>
        {players.map((p) => (
          <button key={p.id} type="button" aria-pressed={value === p.id} onClick={() => onChange(p.id)}>
            {p.name}
          </button>
        ))}
      </div>
      {players.length === 0 && <p>Belum ada pemain di sisi ini.</p>}
    </fieldset>
  );
}
