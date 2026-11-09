import { describe, expect, it } from "vitest";
import { computeFees, computeWithdrawFee, percentOf } from "./fees";

describe("percentOf (pembulatan setengah ke atas)", () => {
  it.each([
    [100_000, 0, 0],
    [100_000, 5, 5_000],
    [100_000, 2.5, 2_500],
    [99_999, 2.5, 2_500], // 2499.975 -> 2500
    [10_001, 5, 500], // 500.05 -> 500
    [10, 5, 1], // 0.5 -> 1 (setengah ke atas)
    [9, 5, 0], // 0.45 -> 0
    [100_000, 100, 100_000],
  ])("amount %i persen %f -> %i", (amount, percent, expected) => {
    expect(percentOf(amount, percent)).toBe(expected);
  });

  it("menolak input tidak valid", () => {
    expect(() => percentOf(1.5, 5)).toThrow(RangeError);
    expect(() => percentOf(-1, 5)).toThrow(RangeError);
    expect(() => percentOf(100, 101)).toThrow(RangeError);
    expect(() => percentOf(100, -1)).toThrow(RangeError);
  });
});

describe("computeFees model payer_fee", () => {
  it("fee ditambahkan ke tagihan, penerima menerima harga penuh", () => {
    expect(computeFees("payer_fee", 5, 100_000)).toEqual({
      chargeAmount: 105_000,
      creditAmount: 100_000,
      platformFee: 5_000,
      gatewayFee: 0,
      platformNet: 5_000,
    });
  });

  it("persen 0: tidak ada fee", () => {
    const r = computeFees("payer_fee", 0, 100_000);
    expect(r.chargeAmount).toBe(100_000);
    expect(r.platformFee).toBe(0);
  });

  it("persen tidak bulat", () => {
    const r = computeFees("payer_fee", 2.5, 99_999);
    expect(r.platformFee).toBe(2_500);
    expect(r.chargeAmount).toBe(102_499);
  });

  it("biaya gateway dikurangkan dari pendapatan bersih aplikasi", () => {
    const r = computeFees("payer_fee", 5, 100_000, 2_000);
    expect(r.platformNet).toBe(3_000);
    expect(r.chargeAmount).toBe(105_000);
  });
});

describe("computeFees model withdraw_percent", () => {
  it("pembayar membayar harga apa adanya, tanpa fee saat bayar", () => {
    expect(computeFees("withdraw_percent", 5, 100_000)).toEqual({
      chargeAmount: 100_000,
      creditAmount: 100_000,
      platformFee: 0,
      gatewayFee: 0,
      platformNet: 0,
    });
  });

  it("biaya gateway menjadi beban aplikasi (asumsi sementara)", () => {
    expect(computeFees("withdraw_percent", 5, 100_000, 2_000).platformNet).toBe(-2_000);
  });
});

describe("computeWithdrawFee", () => {
  it("memotong persen dari jumlah yang ditarik", () => {
    expect(computeWithdrawFee(5, 200_000)).toEqual({ fee: 10_000, net: 190_000 });
  });

  it("persen 0 tidak memotong", () => {
    expect(computeWithdrawFee(0, 200_000)).toEqual({ fee: 0, net: 200_000 });
  });

  it("fee + net selalu sama dengan jumlah ditarik", () => {
    for (const amount of [1, 7, 999, 12_345, 1_000_001]) {
      for (const percent of [0, 0.5, 2.5, 3.33, 10, 100]) {
        const { fee, net } = computeWithdrawFee(percent, amount);
        expect(fee + net).toBe(amount);
        expect(net).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe("validasi uang", () => {
  it("menolak desimal dan angka negatif", () => {
    expect(() => computeFees("payer_fee", 5, 100.5)).toThrow(RangeError);
    expect(() => computeFees("payer_fee", 5, -1)).toThrow(RangeError);
    expect(() => computeFees("payer_fee", 5, 100, 1.5)).toThrow(RangeError);
  });
});
