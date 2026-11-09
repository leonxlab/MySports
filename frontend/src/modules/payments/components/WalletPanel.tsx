"use client";

import Link from "next/link";
import { useState } from "react";
import { paymentsApi } from "../api";
import { formatDateTime, rupiah } from "../format";
import { errorMessage, useAction, useLoad } from "../useLoad";
import { Card, ErrorNote, Loading } from "./Status";

const ENTRY_LABEL: Record<string, string> = {
  credit: "Pemasukan",
  debit: "Pengeluaran",
  withdrawal: "Penarikan",
};

export function WalletPanel() {
  const wallet = useLoad(() => paymentsApi.getWallet());
  const entries = useLoad(() => paymentsApi.listWalletEntries(30));
  const withdrawals = useLoad(() => paymentsApi.listWithdrawals());

  return (
    <>
      {wallet.loading ? <Loading /> : <ErrorNote message={wallet.error} />}
      {wallet.data && (
        <Card>
          <div>Saldo</div>
          <strong style={{ fontSize: 28 }}>{rupiah(wallet.data.balance)}</strong>
          <div style={{ marginTop: 8 }}>
            <Link href="/wallet/withdraw">Tarik saldo</Link>
          </div>
        </Card>
      )}

      <h2>Riwayat saldo</h2>
      {entries.loading && <Loading />}
      <ErrorNote message={entries.error} />
      {entries.data?.length === 0 && <p>Belum ada transaksi.</p>}
      {entries.data?.map((e) => (
        <Card key={e.id}>
          {ENTRY_LABEL[e.kind] ?? e.kind}: {rupiah(e.amount)} · {formatDateTime(e.createdAt)}
        </Card>
      ))}

      <h2>Penarikan</h2>
      {withdrawals.loading && <Loading />}
      <ErrorNote message={withdrawals.error} />
      {withdrawals.data?.length === 0 && <p>Belum ada penarikan.</p>}
      {withdrawals.data?.map((w) => (
        <Card key={w.id}>
          {rupiah(w.amount)} (biaya {rupiah(w.fee)}) · {w.status} · {formatDateTime(w.createdAt)}
        </Card>
      ))}
    </>
  );
}

export function WithdrawForm() {
  const [amount, setAmount] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const { busy, error, run } = useAction();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setDone(null);
    const value = Number(amount);
    if (!Number.isInteger(value) || value < 1) return;
    const r = await run(() => paymentsApi.requestWithdrawal(value));
    if (r) {
      setDone(`Penarikan diajukan: ${rupiah(r.amount)}, biaya ${rupiah(r.fee)}, diterima ${rupiah(r.net)}.`);
      setAmount("");
    }
  }

  return (
    <form onSubmit={submit}>
      <label>
        Jumlah (rupiah){" "}
        <input
          type="number"
          min={1}
          step={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </label>{" "}
      <button type="submit" disabled={busy}>
        {busy ? "Memproses…" : "Tarik"}
      </button>
      <ErrorNote message={error} />
      {done && <p role="status">{done}</p>}
      <p style={{ opacity: 0.7 }}>
        Biaya penarikan dihitung server dan ditampilkan setelah pengajuan. Tujuan transfer belum tersedia.
      </p>
    </form>
  );
}

export { errorMessage };
