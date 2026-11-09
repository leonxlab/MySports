/** Aturan murni open play (tanpa database). */
export interface BookingWindow {
  startsAt: string;
  endsAt: string;
}

/** Ada satu booking terkonfirmasi yang menutup seluruh jam open play (keputusan: Coach wajib sewa lapangan). */
export function coveringBooking<T extends BookingWindow>(
  bookings: T[],
  startsAt: string,
  endsAt: string,
): T | null {
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  return (
    bookings.find((b) => new Date(b.startsAt).getTime() <= start && new Date(b.endsAt).getTime() >= end) ?? null
  );
}

export type OpenPlayStatus = "open" | "full" | "closed" | "finished" | "cancelled";

const transitions: Record<OpenPlayStatus, readonly OpenPlayStatus[]> = {
  open: ["closed", "cancelled", "finished"],
  full: ["closed", "cancelled", "finished"],
  closed: ["open", "cancelled", "finished"],
  finished: [],
  cancelled: [],
};

/** Status yang boleh diatur Coach. `full` hanya diatur sistem berdasarkan kuota. */
export function canChangeStatus(from: OpenPlayStatus, to: OpenPlayStatus): boolean {
  return from === to || transitions[from].includes(to);
}

/** Kuota baru tidak boleh lebih kecil dari peserta yang sudah memegang kursi. */
export function quotaAllowed(newQuota: number, activeParticipants: number): boolean {
  return Number.isInteger(newQuota) && newQuota >= 1 && newQuota >= activeParticipants;
}

/** True bila dua rentang waktu bertabrakan (batas sentuh tidak dihitung). */
export function timesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd);
}
