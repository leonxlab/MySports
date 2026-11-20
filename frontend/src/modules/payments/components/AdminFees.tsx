"use client";

import { useState } from "react";
import { paymentsApi } from "../api";
import { rupiah } from "../format";
import { useAction, useLoad } from "../useLoad";
import type { FeeModel, FeePreview } from "../types";
import { Card, ErrorNote, Loading } from "./Status";

const MODEL_LABEL: Record<FeeModel, string> = {
  payer_fee: "Fee ditambahkan ke pembayar",
  withdraw_percent: "Potongan saat penerima menarik saldo",
};

export function AdminFees() {
  const settings = useLoad(() => paymentsApi.getFeeSettings());
  const [model, setModel] = useState<FeeModel | null>(null);
  const [percent, setPercent] = useState<number | null>(null);
  const [amount, setAmount] = useState(100_000);
  const [preview, setPreview] = useState<FeePreview | null>(null);
  const [saved, setSaved] = useState(false);
  const previewAction = useAction();
  const saveAction = useAction();

  if (settings.loading) return <Loading />;
  if (!settings.data) return <ErrorNote message={settings.error ?? "Pengaturan tidak ditemukan"} />;

  const currentModel = model ?? settings.data.model;
  const currentPercent = percent ?? settings.data.percent;

  async function showPreview() {
    setSaved(false);
    const p = await previewAction.run(() =>
      paymentsApi.previewFees({ model: currentModel, percent: currentPercent, amount }),
    );
    if (p) setPreview(p);
  }
  async function save() {
    const r = await saveAction.run(() => paymentsApi.updateFeeSettings({ model: currentModel, percent: currentPercent }));
    if (r) {
      settings.setData(r);
      setModel(null);
      setPercent(null);
      setSaved(true);
    }
  }

  return (
    <>
      <Card>
        <div>
          Berlaku sekarang: <strong>{MODEL_LABEL[settings.data.model]}</strong>, {settings.data.percent}%
        </div>
      </Card>

      <fieldset>
        <legend>Model biaya</legend>
        {(Object.keys(MODEL_LABEL) as FeeModel[]).map((m) => (
          <label key={m} style={{ display: "block" }}>
            <input
              type="radio"
              name="model"
              checked={currentModel === m}
              onChange={() => {
                setModel(m);
                setPreview(null);
              }}
            />{" "}
            {MODEL_LABEL[m]}
          </label>
        ))}
      </fieldset>
      <label style={{ display: "block", margin: "8px 0" }}>
        Persen{" "}
        <input
          type="number"
          min={0}
          max={100}
          step={0.1}
          value={currentPercent}
          onChange={(e) => {
            setPercent(Number(e.target.value));
            setPreview(null);
          }}
          style={{ width: 80 }}
        />
      </label>

      <Card>
        <strong>Contoh hitungan</strong>
        <div style={{ margin: "6px 0" }}>
          <label>
            Harga{" "}
            <input type="number" min={0} step={1000} value={amount} onChange={(e) => setAmount(Number(e.target.value))} style={{ width: 120 }} />
          </label>{" "}
          <button type="button" onClick={showPreview} disabled={previewAction.busy}>
            Hitung
          </button>
        </div>
        <ErrorNote message={previewAction.error} />
        {preview && (
          <ul>
            <li>Pembayar membayar: {rupiah(preview.charge.chargeAmount)}</li>
            <li>Masuk ke saldo penerima: {rupiah(preview.charge.creditAmount)}</li>
            <li>Fee aplikasi saat bayar: {rupiah(preview.charge.platformFee)}</li>
            {preview.withdraw && (
              <li>
                Saat menarik {rupiah(preview.charge.creditAmount)}: potongan {rupiah(preview.withdraw.fee)}, diterima{" "}
                {rupiah(preview.withdraw.net)}
              </li>
            )}
          </ul>
        )}
        <small>Dihitung oleh server dengan aturan pembulatan yang sama seperti transaksi sungguhan.</small>
      </Card>

      <button type="button" onClick={save} disabled={saveAction.busy || !preview}>
        Simpan pengaturan
      </button>
      {!preview && <small> Hitung contoh dulu sebelum menyimpan.</small>}
      {saved && <p role="status">Tersimpan.</p>}
      <ErrorNote message={saveAction.error} />
    </>
  );
}
