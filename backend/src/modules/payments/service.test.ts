import { describe, expect, it, vi } from "vitest";
import type { AppContext } from "../../core/context";
import { createPaymentsService, type PaidPayment } from "./service";

const makeCtx = () => ({}) as AppContext;
const payment = (targetType: PaidPayment["targetType"]): PaidPayment => ({
  paymentId: "p1",
  payerId: "u1",
  payeeId: "u2",
  targetType,
  targetId: "t1",
  amount: 100_000,
});

describe("onPaid registry", () => {
  it("handler terdaftar dipanggil untuk target yang cocok saja", async () => {
    const ctx = makeCtx();
    const openPlay = vi.fn(async () => {});
    const booking = vi.fn(async () => {});
    createPaymentsService(ctx).onPaid("open_play", openPlay);
    createPaymentsService(ctx).onPaid("court_booking", booking);

    await createPaymentsService(ctx).dispatchPaid(payment("open_play"));

    expect(openPlay).toHaveBeenCalledOnce();
    expect(booking).not.toHaveBeenCalled();
  });

  it("registri dipakai bersama antar pemanggil createPaymentsApi(ctx) yang sama", async () => {
    const ctx = makeCtx();
    const handler = vi.fn(async () => {});
    createPaymentsService(ctx).onPaid("open_play", handler);
    await createPaymentsService(ctx).dispatchPaid(payment("open_play"));
    expect(handler).toHaveBeenCalledOnce();
  });

  it("konteks berbeda tidak saling memanggil handler", async () => {
    const handler = vi.fn(async () => {});
    createPaymentsService(makeCtx()).onPaid("open_play", handler);
    await createPaymentsService(makeCtx()).dispatchPaid(payment("open_play"));
    expect(handler).not.toHaveBeenCalled();
  });

  it("beberapa handler untuk target yang sama dipanggil berurutan", async () => {
    const ctx = makeCtx();
    const order: number[] = [];
    createPaymentsService(ctx).onPaid("open_play", async () => void order.push(1));
    createPaymentsService(ctx).onPaid("open_play", async () => void order.push(2));
    await createPaymentsService(ctx).dispatchPaid(payment("open_play"));
    expect(order).toEqual([1, 2]);
  });
});

describe("fungsi yang belum diimplementasi", () => {
  it("melempar NOT_IMPLEMENTED 501", async () => {
    const svc = createPaymentsService(makeCtx());
    await expect(svc.settle("p1")).rejects.toMatchObject({ status: 501, code: "NOT_IMPLEMENTED" });
    await expect(svc.getFeeSettings()).rejects.toMatchObject({ status: 501 });
  });
});
