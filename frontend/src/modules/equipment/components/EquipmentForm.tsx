"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { FeedShell, RightPanel } from "@/components/feed";
import styles from "@/components/feed/FeedPage.module.css";
import { useMe } from "@/modules/accounts/components/SessionProvider";

const sports = ["Badminton", "Basket", "Futsal", "Tennis", "Padel"];

export function EquipmentForm() {
  const { user } = useMe();
  const [kind, setKind] = useState<"offer" | "request">("offer");
  const [sport, setSport] = useState("Badminton");
  const [itemName, setItemName] = useState("");
  const [condition, setCondition] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [period, setPeriod] = useState("");
  const [location, setLocation] = useState("");
  const [price, setPrice] = useState(0);
  const [deposit, setDeposit] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(
      "Data hanya untuk pratinjau dan belum disimpan. Endpoint peminjaman alat belum tersedia.",
    );
  }

  const header = (
    <div className={styles.headerInner}>
      <Link className={styles.inlineMessage} href="/equipment">
        ← Kembali ke peminjaman alat
      </Link>
      <h1 className={styles.pageTitle}>{kind === "offer" ? "Tawarkan alat" : "Cari pinjaman"}</h1>
    </div>
  );
  const rightPanel = (
    <RightPanel title="Pratinjau formulir">
      <p className={styles.muted}>
        Endpoint peminjaman alat belum tersedia. Informasi yang diisi tidak dikirim atau disimpan.
      </p>
    </RightPanel>
  );

  return (
    <FeedShell activeNav="equipment" header={header} hideCompose rightPanel={rightPanel}>
      {!user ? (
        <div className={styles.formCard}>
          <p>Masuk untuk membuat postingan alat.</p>
          <Link className={styles.panelAction} href="/login">
            Masuk
          </Link>
        </div>
      ) : (
        <form className={styles.formCard} onSubmit={submit}>
          <label className={styles.formField}>
            Jenis postingan
            <select
              onChange={(event) => {
                setKind(event.target.value as "offer" | "request");
                setNotice(null);
              }}
              value={kind}
            >
              <option value="offer">Tawarkan alat</option>
              <option value="request">Cari pinjaman</option>
            </select>
          </label>
          <label className={styles.formField}>
            Olahraga
            <select onChange={(event) => setSport(event.target.value)} value={sport}>
              {sports.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.formField}>
            Nama alat
            <input
              onChange={(event) => setItemName(event.target.value)}
              required
              value={itemName}
            />
          </label>
          <label className={styles.formField}>
            Kondisi atau preferensi kondisi
            <input
              onChange={(event) => setCondition(event.target.value)}
              required
              value={condition}
            />
          </label>
          <label className={styles.formField}>
            Jumlah
            <input
              min={1}
              onChange={(event) => setQuantity(Number(event.target.value))}
              required
              type="number"
              value={quantity}
            />
          </label>
          <label className={styles.formField}>
            Periode
            <input onChange={(event) => setPeriod(event.target.value)} required value={period} />
          </label>
          <label className={styles.formField}>
            Lokasi
            <input
              onChange={(event) => setLocation(event.target.value)}
              required
              value={location}
            />
          </label>
          {kind === "offer" ? (
            <>
              <label className={styles.formField}>
                Biaya (rupiah, 0 untuk gratis)
                <input
                  min={0}
                  onChange={(event) => setPrice(Number(event.target.value))}
                  type="number"
                  value={price}
                />
              </label>
              <label className={styles.formField}>
                Deposit (rupiah, 0 jika tidak ada)
                <input
                  min={0}
                  onChange={(event) => setDeposit(Number(event.target.value))}
                  type="number"
                  value={deposit}
                />
              </label>
            </>
          ) : null}
          <button type="submit">Pratinjau postingan</button>
          {notice ? (
            <p className={styles.inlineMessage} role="status">
              {notice}
            </p>
          ) : null}
        </form>
      )}
    </FeedShell>
  );
}
