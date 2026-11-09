/** Fungsi murni untuk slot lapangan. */
export interface SlotLike {
  id: string;
  startsAt: string;
  endsAt: string;
  status: "free" | "booked" | "blocked";
}

/**
 * Pilih slot yang persis menutup rentang [startsAt, endsAt) tanpa celah dan tanpa tumpang tindih.
 * Mengembalikan null bila tidak bisa (ada celah, slot tidak free, atau batas tidak pas).
 */
export function slotsCovering(slots: SlotLike[], startsAt: string, endsAt: string): SlotLike[] | null {
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  if (!(end > start)) return null;

  const sorted = [...slots].sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
  const picked: SlotLike[] = [];
  let cursor = start;
  for (const s of sorted) {
    const sStart = new Date(s.startsAt).getTime();
    const sEnd = new Date(s.endsAt).getTime();
    if (sEnd <= start || sStart >= end) continue;
    if (sStart !== cursor || s.status !== "free") return null;
    picked.push(s);
    cursor = sEnd;
  }
  return cursor === end && picked.length > 0 ? picked : null;
}

/** True bila dua rentang waktu bertabrakan (batas sentuh tidak dihitung). */
export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd);
}

/** Kembalikan pasangan slot input yang saling tumpang tindih, atau null. */
export function findOverlap<T extends { startsAt: string; endsAt: string }>(items: T[]): [T, T] | null {
  for (let i = 0; i < items.length; i++) {
    const a = items[i]!;
    if (!(new Date(a.endsAt) > new Date(a.startsAt))) return [a, a];
    for (let j = i + 1; j < items.length; j++) {
      const b = items[j]!;
      if (overlaps(a.startsAt, a.endsAt, b.startsAt, b.endsAt)) return [a, b];
    }
  }
  return null;
}
