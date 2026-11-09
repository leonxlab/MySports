/**
 * Hitungan biaya layanan (fungsi murni). Aturan: proposal bagian "Pembayaran dan Biaya Layanan".
 *
 * Semua jumlah adalah bilangan bulat rupiah (tanpa desimal, tanpa float untuk uang).
 * Persentase dihitung dalam basis poin (1% = 100 bp) lalu dibulatkan setengah ke atas
 * satu kali, di `percentOf`. Jangan membulatkan di tempat lain.
 */
export type FeeModel = "withdraw_percent" | "payer_fee";

export interface FeeResult {
  /** Yang ditagih ke pembayar. */
  chargeAmount: number;
  /** Yang masuk ke saldo penerima (sebelum potongan saat withdraw). */
  creditAmount: number;
  /** Fee aplikasi yang dipungut saat pembayaran (hanya model payer_fee). */
  platformFee: number;
  /** Biaya gateway untuk transaksi ini (informasi). */
  gatewayFee: number;
  /**
   * TODO(decision): siapa menanggung biaya gateway. Asumsi sementara: aplikasi menanggung,
   * jadi pendapatan bersih aplikasi = platformFee - gatewayFee (bisa negatif).
   */
  platformNet: number;
}

export interface WithdrawFeeResult {
  fee: number;
  net: number;
}

function assertMoney(value: number, name: string) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name} harus bilangan bulat rupiah >= 0`);
  }
}

export function toBasisPoints(percent: number): number {
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    throw new RangeError("percent harus 0 sampai 100");
  }
  return Math.round(percent * 100);
}

/** Satu-satunya fungsi pembulatan: setengah ke atas, murni bilangan bulat. */
export function percentOf(amount: number, percent: number): number {
  assertMoney(amount, "amount");
  const bp = toBasisPoints(percent);
  return Math.floor((amount * bp + 5000) / 10000);
}

export function computeFees(
  model: FeeModel,
  percent: number,
  amount: number,
  gatewayFee = 0,
): FeeResult {
  assertMoney(amount, "amount");
  assertMoney(gatewayFee, "gatewayFee");

  if (model === "payer_fee") {
    const platformFee = percentOf(amount, percent);
    return {
      chargeAmount: amount + platformFee,
      creditAmount: amount,
      platformFee,
      gatewayFee,
      platformNet: platformFee - gatewayFee,
    };
  }

  // withdraw_percent: pembayar membayar harga apa adanya, potongan diambil saat withdraw.
  return {
    chargeAmount: amount,
    creditAmount: amount,
    platformFee: 0,
    gatewayFee,
    platformNet: -gatewayFee,
  };
}

/** Potongan saat penarikan. Dipakai hanya bila model aktif = withdraw_percent. */
export function computeWithdrawFee(percent: number, amount: number): WithdrawFeeResult {
  const fee = percentOf(amount, percent);
  return { fee, net: amount - fee };
}
