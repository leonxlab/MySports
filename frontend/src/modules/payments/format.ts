// Format tampilan saja. Tidak ada hitungan biaya di sini (aturan bisnis hanya di backend).
// TODO(frontend-core): pindahkan format dan useLoad ke src/lib bila tim setuju.

export const rupiah = (n: number) => `Rp${Math.round(n).toLocaleString("id-ID")}`;

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });

export const formatTimeRange = (startIso: string, endIso: string) =>
  `${formatDateTime(startIso)} – ${new Date(endIso).toLocaleTimeString("id-ID", { timeStyle: "short" })}`;

export const formatDuration = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
};

export const SPORT_LABEL: Record<string, string> = {
  basketball: "Basket",
  badminton: "Badminton",
  tennis: "Tenis",
  padel: "Padel",
  futsal: "Futsal",
};
