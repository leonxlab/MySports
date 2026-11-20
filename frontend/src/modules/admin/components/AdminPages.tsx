"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { adminApi } from "../api";
import type { AdminAuditPage, AdminOverview } from "../types";

const styles = {
  main: { margin: "0 auto", maxWidth: 1000, padding: 24 } as const,
  panel: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    marginTop: 16,
    padding: 20,
  } as const,
  input: {
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    font: "inherit",
    padding: "9px 10px",
  } as const,
  button: {
    background: "#0f172a",
    border: 0,
    borderRadius: 8,
    color: "#fff",
    cursor: "pointer",
    font: "inherit",
    padding: "10px 14px",
  } as const,
};

function ErrorMessage({ message }: { message: string | null }) {
  return message ? (
    <p role="alert" style={{ color: "#b91c1c" }}>
      {message}
    </p>
  ) : null;
}

export function AdminOverviewPage() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    adminApi
      .getOverview()
      .then((result) => {
        if (active) setOverview(result);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Dasbor gagal dimuat.");
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main style={styles.main}>
      <header style={{ alignItems: "center", display: "flex", justifyContent: "space-between" }}>
        <h1>Dasbor admin</h1>
        <nav style={{ display: "flex", gap: 16 }}>
          <Link href="/admin/audit">Audit log</Link>
          <Link href="/admin/reports">Laporan komunitas</Link>
        </nav>
      </header>
      <ErrorMessage message={error} />
      {!overview && !error ? <p role="status">Memuat ringkasan...</p> : null}
      {overview ? (
        <section
          aria-label="Ringkasan admin"
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          }}
        >
          <OverviewCard label="Pengajuan role menunggu" value={overview.pending_role_requests} />
          <OverviewCard label="Lapangan menunggu persetujuan" value={overview.pending_venues} />
          <OverviewCard label="Laporan komunitas terbuka" value={overview.open_content_reports} />
          <OverviewCard label="Flag anti-cheat terbuka" value={overview.open_anti_cheat_flags} />
        </section>
      ) : null}
      <p style={{ color: "#64748b" }}>
        Hitungan pengajuan role, lapangan, dan anti-cheat akan aktif setelah API modul pemilik
        tersedia.
      </p>
    </main>
  );
}

function OverviewCard({ label, value }: { label: string; value: number }) {
  return (
    <article style={styles.panel}>
      <p style={{ color: "#475569", margin: 0 }}>{label}</p>
      <strong style={{ display: "block", fontSize: 28, marginTop: 8 }}>{value}</strong>
    </article>
  );
}

export function AdminAuditPage() {
  const [adminId, setAdminId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [filters, setFilters] = useState<{ admin_id?: string; from?: string; to?: string }>({});
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const [page, setPage] = useState<AdminAuditPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cursor = cursors[cursors.length - 1];

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    adminApi
      .listAuditLog({ ...filters, cursor, limit: 50 })
      .then((result) => {
        if (active) setPage(result);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Audit log gagal dimuat.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [cursor, filters]);

  function applyFilters(event: FormEvent) {
    event.preventDefault();
    setCursors([undefined]);
    setFilters({
      admin_id: adminId.trim() || undefined,
      from: from || undefined,
      to: to || undefined,
    });
  }

  return (
    <main style={styles.main}>
      <header style={{ alignItems: "center", display: "flex", justifyContent: "space-between" }}>
        <h1>Audit log</h1>
        <Link href="/admin">Kembali ke dasbor</Link>
      </header>
      <form
        onSubmit={applyFilters}
        style={{ ...styles.panel, display: "flex", flexWrap: "wrap", gap: 12 }}
      >
        <label>
          ID admin
          <input
            aria-label="ID admin"
            onChange={(event) => setAdminId(event.target.value)}
            placeholder="UUID"
            style={styles.input}
            value={adminId}
          />
        </label>
        <label>
          Dari tanggal
          <input
            aria-label="Dari tanggal"
            onChange={(event) => setFrom(event.target.value)}
            style={styles.input}
            type="date"
            value={from}
          />
        </label>
        <label>
          Sampai tanggal
          <input
            aria-label="Sampai tanggal"
            onChange={(event) => setTo(event.target.value)}
            style={styles.input}
            type="date"
            value={to}
          />
        </label>
        <button style={styles.button} type="submit">
          Terapkan filter
        </button>
      </form>
      <ErrorMessage message={error} />
      {loading ? <p role="status">Memuat audit log...</p> : null}
      {!loading && !error && !page?.items.length ? (
        <p>Belum ada tindakan admin untuk filter ini.</p>
      ) : null}
      {page?.items.map((entry) => (
        <article key={String(entry.id)} style={styles.panel}>
          <header
            style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "space-between" }}
          >
            <strong>
              {entry.method} {entry.path}
            </strong>
            <time dateTime={entry.created_at}>
              {new Date(entry.created_at).toLocaleString("id-ID")}
            </time>
          </header>
          <p style={{ color: "#475569" }}>Admin: {entry.admin_id}</p>
          <details>
            <summary>Detail target</summary>
            <pre style={{ overflowX: "auto", whiteSpace: "pre-wrap" }}>
              {JSON.stringify(entry.target, null, 2)}
            </pre>
          </details>
        </article>
      ))}
      <nav aria-label="Halaman audit log" style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <button
          disabled={cursors.length === 1 || loading}
          onClick={() => setCursors((current) => current.slice(0, -1))}
          style={styles.button}
          type="button"
        >
          Sebelumnya
        </button>
        {page?.next_cursor ? (
          <button
            disabled={loading}
            onClick={() => setCursors((current) => [...current, page.next_cursor ?? undefined])}
            style={styles.button}
            type="button"
          >
            Berikutnya
          </button>
        ) : null}
      </nav>
    </main>
  );
}
