/**
 * State machine status pembayaran. Transisi ilegal ditolak.
 *
 *   pending -> paid | failed
 *   paid    -> settled | refunded
 *   settled, failed, refunded: akhir
 *
 * TODO(decision): kebijakan refund belum diputuskan. Asumsi sementara: refund hanya dari
 * `paid` (sebelum dana diteruskan). Mengubahnya cukup dengan menambah baris di `transitions`.
 */
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded" | "settled";

const transitions: Record<PaymentStatus, readonly PaymentStatus[]> = {
  pending: ["paid", "failed"],
  paid: ["settled", "refunded"],
  failed: [],
  refunded: [],
  settled: [],
};

export function canTransition(from: PaymentStatus, to: PaymentStatus): boolean {
  return transitions[from].includes(to);
}

export class IllegalTransitionError extends Error {
  constructor(
    public from: PaymentStatus,
    public to: PaymentStatus,
  ) {
    super(`Transisi pembayaran tidak sah: ${from} -> ${to}`);
  }
}

export function assertTransition(from: PaymentStatus, to: PaymentStatus): void {
  if (!canTransition(from, to)) throw new IllegalTransitionError(from, to);
}

export function isFinal(status: PaymentStatus): boolean {
  return transitions[status].length === 0;
}
