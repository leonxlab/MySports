import { createHmac, timingSafeEqual } from "node:crypto";
import type { Env } from "../../config/env";

/**
 * Antarmuka payment gateway. Penyedia sungguhan belum dipilih
 * (TODO(decision): lihat docs/decisions/payment-gateway.md), jadi hanya FakeGateway yang ada.
 * Status bayar HANYA boleh berasal dari webhook yang lolos verifyWebhook.
 */
export interface ChargeInput {
  /** Kunci idempotensi dari server (bukan dari klien). */
  idempotencyKey: string;
  /** Rupiah bulat, sudah dihitung server. */
  amount: number;
  description: string;
}

export interface Charge {
  gatewayRef: string;
  /** Hanya untuk tampilan klien. Bukan bukti bayar. */
  redirectUrl: string | null;
}

export interface GatewayEvent {
  gatewayRef: string;
  status: "paid" | "failed";
  amount: number;
  /** Biaya yang dipotong gateway, rupiah bulat (0 bila tidak diketahui). */
  gatewayFee: number;
}

export interface PaymentGateway {
  readonly name: string;
  createCharge(input: ChargeInput): Promise<Charge>;
  /** rawBody harus byte asli request, bukan hasil parse ulang. */
  verifyWebhook(rawBody: string, headers: Record<string, string | undefined>): boolean;
  parseEvent(rawBody: string): GatewayEvent;
}

export const FAKE_SIGNATURE_HEADER = "x-fake-signature";

export function signFake(rawBody: string, secret: string): string {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}

/** Gateway tiruan untuk dev dan test. Tidak pernah dipakai di production. */
export class FakeGateway implements PaymentGateway {
  readonly name = "fake";
  private counter = 0;

  constructor(private secret: string) {
    if (!secret) throw new Error("FakeGateway butuh PAYMENT_WEBHOOK_SECRET");
  }

  async createCharge(input: ChargeInput): Promise<Charge> {
    this.counter += 1;
    return { gatewayRef: `fake_${input.idempotencyKey}_${this.counter}`, redirectUrl: null };
  }

  verifyWebhook(rawBody: string, headers: Record<string, string | undefined>): boolean {
    const given = headers[FAKE_SIGNATURE_HEADER];
    if (!given) return false;
    const expected = signFake(rawBody, this.secret);
    const a = Buffer.from(given);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  parseEvent(rawBody: string): GatewayEvent {
    const body = JSON.parse(rawBody) as Partial<GatewayEvent>;
    const { gatewayRef, status, amount } = body;
    if (typeof gatewayRef !== "string" || (status !== "paid" && status !== "failed")) {
      throw new Error("Event gateway tidak valid");
    }
    if (typeof amount !== "number" || !Number.isSafeInteger(amount)) {
      throw new Error("Event gateway tidak valid");
    }
    return { gatewayRef, status, amount, gatewayFee: body.gatewayFee ?? 0 };
  }
}

/** Pilih gateway dari env. Penyedia selain "fake" sengaja belum ada. */
export function createGateway(env: Pick<Env, "PAYMENT_PROVIDER" | "PAYMENT_WEBHOOK_SECRET">) {
  if (env.PAYMENT_PROVIDER === "fake") return new FakeGateway(env.PAYMENT_WEBHOOK_SECRET);
  throw new Error(
    `PAYMENT_PROVIDER "${env.PAYMENT_PROVIDER}" belum didukung. TODO(decision): pilih gateway.`,
  );
}
