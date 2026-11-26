import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { Env } from "../../config/env";

/**
 * Antarmuka payment gateway. Penyedia yang didukung: "fake" (dev/test) dan
 * "lxpay" (QRIS LeonXLab, lihat https://leonxlab.app/docs/lxpay).
 * Status bayar HANYA boleh berasal dari webhook yang lolos verifyWebhook
 * (atau poll status server-ke-server lewat getTransaction).
 */
export interface ChargeInput {
  /** Kunci idempotensi dari server (bukan dari klien). */
  idempotencyKey: string;
  /** Rupiah bulat, sudah dihitung server. */
  amount: number;
  description: string;
}

export interface QrisInfo {
  /** Payload QRIS siap render sebagai QR image. */
  payload: string;
  /** Nominal persis yang harus dibayar pembayar: tagihan + kode unik gateway. */
  amountWithCode: number;
  expiresAt: string | null;
}

export interface Charge {
  gatewayRef: string;
  /** Hanya untuk tampilan klien. Bukan bukti bayar. */
  redirectUrl: string | null;
  /** Instruksi bayar QRIS (gateway LxPay). Tidak ada di gateway redirect. */
  qris?: QrisInfo;
}

export interface GatewayEvent {
  gatewayRef: string;
  status: "paid" | "failed";
  amount: number;
  /** Biaya yang dipotong gateway, rupiah bulat (0 bila tidak diketahui). */
  gatewayFee: number;
}

export interface GatewayTransactionStatus {
  status: "pending" | "paid" | "expired";
  /** Nominal tagihan sesuai yang kita kirim. Null bila tidak diketahui. */
  amount: number | null;
}

export interface PaymentGateway {
  readonly name: string;
  createCharge(input: ChargeInput): Promise<Charge>;
  /** rawBody harus byte asli request, bukan hasil parse ulang. */
  verifyWebhook(rawBody: string, headers: Record<string, string | undefined>): boolean;
  /**
   * Kembalikan `null` untuk event yang dikenal tapi tidak menandai lunas/gagal
   * (diabaikan, webhook tetap di-ack). Invalid body: throw.
   */
  parseEvent(rawBody: string): GatewayEvent | null;
  /**
   * Poll status transaksi server-ke-server sebagai cadangan bila webhook
   * tidak sampai. Gateway tanpa poll API tidak mendefinisikan metode ini.
   */
  getTransaction?(gatewayRef: string): Promise<GatewayTransactionStatus>;
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

export const LXPAY_SIGNATURE_HEADER = "x-lxpay-signature";
const LXPAY_DEFAULT_BASE_URL = "https://leonxlab.app";

/** Signature webhook LxPay: sha256(webhookSecret + "." + rawBody), hex. */
export function signLxPay(rawBody: string, secret: string): string {
  return createHash("sha256").update(`${secret}.${rawBody}`).digest("hex");
}

interface LxPayTransaction {
  reference?: unknown;
  status?: unknown;
  amount?: unknown;
  amountWithCode?: unknown;
  qrisPayload?: unknown;
  expiresAt?: unknown;
}

/**
 * Gateway QRIS LxPay (LeonXLab). Dokumentasi: https://leonxlab.app/docs/lxpay
 *
 * Catatan: LxPay menambahkan "unique code" (3-4 digit) ke nominal agar satu akun
 * QRIS bisa di-match otomatis, jadi pembayar membayar `amountWithCode` (> amount).
 * Webhook hanya mengirim `transaction.paid`; kedaluwarsa dilihat lewat
 * getTransaction. Fee merchant LxPay diasumsikan feeMode=platform (diset di
 * dashboard merchant) supaya tidak menambah beban ke pembayar.
 */
export class LxPayGateway implements PaymentGateway {
  readonly name = "lxpay";
  private baseUrl: string;
  private fetchImpl: typeof fetch;

  constructor(
    private apiKey: string,
    private webhookSecret: string,
    baseUrl = LXPAY_DEFAULT_BASE_URL,
    fetchImpl: typeof fetch = fetch,
  ) {
    if (!apiKey) throw new Error("LxPayGateway butuh LXPAY_API_KEY");
    if (!webhookSecret) throw new Error("LxPayGateway butuh LXPAY_WEBHOOK_SECRET");
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.fetchImpl = fetchImpl;
  }

  private async api(path: string, init?: RequestInit): Promise<{ ok: boolean; status: number; body: unknown }> {
    let res: Response;
    try {
      res = await this.fetchImpl(`${this.baseUrl}/api/lxpay/v1${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          ...init?.headers,
        },
      });
    } catch (e) {
      throw new Error(`LxPay tidak bisa dihubungi: ${(e as Error).message}`);
    }
    const body: unknown = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, body };
  }

  async createCharge(input: ChargeInput): Promise<Charge> {
    // reference = paymentId (<=64 char, unik per merchant). Kirim reference yang
    // sama saat transaksi lama masih PENDING -> LxPay menjawab transaksi yang
    // sama (idempoten), tidak dibuat dua kali.
    const { ok, status, body } = await this.api("/transactions", {
      method: "POST",
      body: JSON.stringify({
        amount: input.amount,
        reference: input.idempotencyKey,
        // Fee aplikasi dihitung sendiri (fee_settings); fee LxPay dipotong dari
        // saldo merchant, bukan ditambahkan ke pembayar.
        feeBearer: "platform",
        expiresInMinutes: 60,
        metadata: { description: input.description },
      }),
    });
    if (!ok) {
      const code = (body as { error?: string } | null)?.error ?? "unknown";
      throw new Error(`LxPay createCharge gagal (HTTP ${status}, ${code})`);
    }
    const tx = (body as { transaction?: LxPayTransaction } | null)?.transaction;
    if (!tx || typeof tx.reference !== "string") {
      throw new Error("Respons LxPay createCharge tidak valid");
    }
    const charge: Charge = { gatewayRef: tx.reference, redirectUrl: null };
    if (typeof tx.qrisPayload === "string" && typeof tx.amountWithCode === "number") {
      charge.qris = {
        payload: tx.qrisPayload,
        amountWithCode: tx.amountWithCode,
        expiresAt: typeof tx.expiresAt === "string" ? tx.expiresAt : null,
      };
    }
    return charge;
  }

  verifyWebhook(rawBody: string, headers: Record<string, string | undefined>): boolean {
    const given = headers[LXPAY_SIGNATURE_HEADER];
    if (!given) return false;
    const expected = signLxPay(rawBody, this.webhookSecret);
    const a = Buffer.from(given);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  parseEvent(rawBody: string): GatewayEvent | null {
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      throw new Error("Body webhook LxPay bukan JSON");
    }
    // Hanya transaction.paid yang menandai lunas. Event lain di-ack tanpa efek.
    if (body.event !== "transaction.paid") return null;
    const { reference, amount } = body;
    if (typeof reference !== "string" || typeof amount !== "number" || !Number.isSafeInteger(amount) || amount < 0) {
      throw new Error("Event LxPay tidak valid");
    }
    return { gatewayRef: reference, status: "paid", amount, gatewayFee: 0 };
  }

  async getTransaction(gatewayRef: string): Promise<GatewayTransactionStatus> {
    const { ok, status, body } = await this.api(`/transactions/${encodeURIComponent(gatewayRef)}`);
    if (!ok) throw new Error(`LxPay getTransaction gagal (HTTP ${status})`);
    const tx = (body as { transaction?: LxPayTransaction } | null)?.transaction;
    if (!tx || typeof tx.status !== "string") throw new Error("Respons LxPay getTransaction tidak valid");
    const map: Record<string, GatewayTransactionStatus["status"]> = {
      PENDING: "pending",
      PAID: "paid",
      EXPIRED: "expired",
    };
    const mapped = map[tx.status];
    if (!mapped) throw new Error(`Status LxPay tidak dikenal: ${tx.status}`);
    return { status: mapped, amount: typeof tx.amount === "number" ? tx.amount : null };
  }
}

/** Pilih gateway dari env: "fake" (dev/test) atau "lxpay" (QRIS LeonXLab). */
export function createGateway(
  env: Pick<Env, "PAYMENT_PROVIDER" | "PAYMENT_WEBHOOK_SECRET" | "LXPAY_API_KEY" | "LXPAY_WEBHOOK_SECRET" | "LXPAY_BASE_URL">,
) {
  if (env.PAYMENT_PROVIDER === "fake") return new FakeGateway(env.PAYMENT_WEBHOOK_SECRET);
  if (env.PAYMENT_PROVIDER === "lxpay") {
    return new LxPayGateway(env.LXPAY_API_KEY, env.LXPAY_WEBHOOK_SECRET, env.LXPAY_BASE_URL || undefined);
  }
  throw new Error(
    `PAYMENT_PROVIDER "${env.PAYMENT_PROVIDER}" belum didukung. Set "fake" (dev) atau "lxpay" (produksi).`,
  );
}
