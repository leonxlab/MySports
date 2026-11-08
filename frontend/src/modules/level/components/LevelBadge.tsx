// Level 0 sampai 300. Nilai dihitung backend, komponen ini hanya menampilkan.
export function LevelBadge({ level }: { level: number }) {
  return <span aria-label={`Level ${level}`}>Lv {level}</span>;
}
