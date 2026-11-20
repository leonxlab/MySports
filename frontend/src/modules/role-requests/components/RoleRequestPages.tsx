"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { accountsApi } from "@/modules/accounts/api";
import { useMe } from "@/modules/accounts/components/SessionProvider";
import { getSupabase } from "@/lib/supabase";
import { roleRequestsApi } from "../api";
import type { RequestEvidence, RequestStatus, RoleRequest } from "../types";

const pageStyle = { margin: "0 auto", maxWidth: 760, padding: 24 } as const;
const cardStyle = {
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  marginTop: 16,
  padding: 20,
} as const;
const fieldStyle = { display: "grid", gap: 6, margin: "12px 0" } as const;
const inputStyle = {
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  font: "inherit",
  padding: "10px 12px",
} as const;
const buttonStyle = {
  background: "#0f172a",
  border: 0,
  borderRadius: 8,
  color: "#fff",
  cursor: "pointer",
  font: "inherit",
  padding: "10px 14px",
} as const;

function Feedback({ error, info }: { error: string | null; info?: string | null }) {
  return (
    <>
      {error ? (
        <p role="alert" style={{ color: "#b91c1c" }}>
          {error}
        </p>
      ) : null}
      {info ? <p role="status">{info}</p> : null}
    </>
  );
}

function useRequireLogin() {
  const { user, isLoading } = useMe();
  const router = useRouter();
  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, router, user]);
  return { user, isLoading };
}

async function uploadEvidence(file: File): Promise<RequestEvidence> {
  const type = file.type.startsWith("image/") ? "image" : "video";
  const signed = await accountsApi.signUpload(
    { file_name: file.name, content_type: file.type },
    "gallery",
  );
  const { error } = await getSupabase()
    .storage.from("media")
    .uploadToSignedUrl(signed.path, signed.token, file, { contentType: file.type });
  if (error) throw error;
  return { type, value: signed.path };
}

export function CoachApplicationPage() {
  const { user, isLoading } = useRequireLogin();
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const evidence: RequestEvidence[] = [];
    if (text.trim()) evidence.push({ type: "text", value: text.trim() });
    if (url.trim()) evidence.push({ type: "url", value: url.trim() });
    if (evidence.length === 0 && !file) {
      setError("Tambahkan minimal satu bukti pengalaman.");
      return;
    }

    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (file) evidence.push(await uploadEvidence(file));
      await roleRequestsApi.submitCoachRequest(evidence, note || undefined);
      setInfo("Pengajuan Coach terkirim. Pantau statusnya di halaman status.");
      setText("");
      setUrl("");
      setFile(null);
      setNote("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Pengajuan gagal dikirim.");
    } finally {
      setBusy(false);
    }
  }

  if (isLoading || !user)
    return (
      <main style={pageStyle}>
        <p role="status">Memeriksa sesi...</p>
      </main>
    );
  return (
    <main style={pageStyle}>
      <h1>Ajukan sebagai Coach</h1>
      <p>Tambahkan bukti pengalaman atau prestasi. Bukti media diunggah langsung ke penyimpanan.</p>
      <Feedback error={error} info={info} />
      <form onSubmit={submit} style={cardStyle}>
        <label style={fieldStyle}>
          Bukti teks
          <textarea
            maxLength={2000}
            onChange={(event) => setText(event.target.value)}
            style={inputStyle}
            value={text}
          />
        </label>
        <label style={fieldStyle}>
          Tautan bukti
          <input
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://..."
            style={inputStyle}
            type="url"
            value={url}
          />
        </label>
        <label style={fieldStyle}>
          Foto atau video bukti
          <input
            accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            type="file"
          />
        </label>
        <label style={fieldStyle}>
          Catatan tambahan
          <textarea
            maxLength={1000}
            onChange={(event) => setNote(event.target.value)}
            style={inputStyle}
            value={note}
          />
        </label>
        <button disabled={busy} style={buttonStyle} type="submit">
          {busy ? "Mengirim..." : "Kirim pengajuan"}
        </button>
      </form>
      <Link href="/apply/status">Lihat status pengajuan</Link>
    </main>
  );
}

export function OwnerApplicationPage() {
  const { user, isLoading } = useRequireLogin();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await roleRequestsApi.submitOwnerRequest(note || undefined);
      setInfo("Pengajuan Owner Lapangan terkirim. Persetujuan lapangan dilakukan terpisah.");
      setNote("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Pengajuan gagal dikirim.");
    } finally {
      setBusy(false);
    }
  }

  if (isLoading || !user)
    return (
      <main style={pageStyle}>
        <p role="status">Memeriksa sesi...</p>
      </main>
    );
  return (
    <main style={pageStyle}>
      <h1>Ajukan sebagai Owner Lapangan</h1>
      <p>Pengajuan role ini terpisah dari pendaftaran dan persetujuan lapangan.</p>
      <Feedback error={error} info={info} />
      <form onSubmit={submit} style={cardStyle}>
        <label style={fieldStyle}>
          Catatan (opsional)
          <textarea
            maxLength={1000}
            onChange={(event) => setNote(event.target.value)}
            style={inputStyle}
            value={note}
          />
        </label>
        <button disabled={busy} style={buttonStyle} type="submit">
          {busy ? "Mengirim..." : "Kirim pengajuan"}
        </button>
      </form>
      <Link href="/apply/status">Lihat status pengajuan</Link>
    </main>
  );
}

export function ApplicationStatusPage() {
  const { user, isLoading } = useRequireLogin();
  const [requests, setRequests] = useState<RoleRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!user) return;
    let active = true;
    roleRequestsApi.listMyRequests().then(
      (data) => {
        if (active) setRequests(data);
      },
      (reason: unknown) => {
        if (active)
          setError(reason instanceof Error ? reason.message : "Status pengajuan gagal dimuat.");
      },
    );
    return () => {
      active = false;
    };
  }, [user]);

  if (isLoading || !user)
    return (
      <main style={pageStyle}>
        <p role="status">Memeriksa sesi...</p>
      </main>
    );
  if (error)
    return (
      <main style={pageStyle}>
        <Feedback error={error} />
      </main>
    );
  return (
    <main style={pageStyle}>
      <h1>Status pengajuan</h1>
      {!requests ? <p role="status">Memuat pengajuan...</p> : null}
      {requests?.length === 0 ? <p>Belum ada pengajuan.</p> : null}
      {requests?.map((request) => (
        <article key={request.id} style={cardStyle}>
          <h2>{request.requested_role === "coach" ? "Coach" : "Owner Lapangan"}</h2>
          <p>Status: {request.status}</p>
          <p>Dikirim: {new Date(request.created_at).toLocaleString("id-ID")}</p>
          {request.rejection_reason ? <p>Alasan penolakan: {request.rejection_reason}</p> : null}
        </article>
      ))}
    </main>
  );
}

function EvidenceView({ item }: { item: RequestEvidence }) {
  if (item.type === "image")
    return <img alt="Bukti foto pemohon" src={item.value} style={{ maxWidth: 240 }} />;
  if (item.type === "video")
    return (
      <video aria-label="Bukti video pemohon" controls src={item.value} style={{ maxWidth: 320 }} />
    );
  if (item.type === "url")
    return (
      <p>
        <a href={item.value} rel="noreferrer" target="_blank">
          {item.value}
        </a>
      </p>
    );
  return <p>{item.value}</p>;
}

export function AdminRoleApprovalsPage() {
  const { user, me, isLoading } = useMe();
  const router = useRouter();
  const [requests, setRequests] = useState<RoleRequest[] | null>(null);
  const [status, setStatus] = useState<RequestStatus>("pending");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [reasonById, setReasonById] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const isAdmin = me?.roles.includes("admin") ?? false;

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
    else if (!isLoading && me && !isAdmin) router.replace("/");
  }, [isAdmin, isLoading, me, router, user]);

  async function loadRequests(nextStatus = status, cursor?: string, append = false) {
    if (!append) {
      setRequests(null);
      setNextCursor(null);
    }
    setError(null);
    try {
      const page = await roleRequestsApi.listRequests({
        status: nextStatus,
        cursor,
      });
      setRequests((current) => (append ? [...(current ?? []), ...page.items] : page.items));
      setNextCursor(page.next_cursor);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Pengajuan gagal dimuat.");
    }
  }

  useEffect(() => {
    if (isAdmin) void loadRequests();
  }, [isAdmin, status]);

  async function review(request: RoleRequest, action: "approve" | "reject") {
    setBusyId(request.id);
    setError(null);
    setInfo(null);
    try {
      if (action === "approve") await roleRequestsApi.approveRequest(request.id);
      else {
        const reason = reasonById[request.id]?.trim();
        if (!reason) {
          setError("Isi alasan penolakan sebelum menolak pengajuan.");
          setBusyId(null);
          return;
        }
        await roleRequestsApi.rejectRequest(request.id, reason);
      }
      setInfo("Pengajuan berhasil diproses.");
      await loadRequests(status);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Pengajuan gagal diproses.");
    } finally {
      setBusyId(null);
    }
  }

  if (isLoading || !user || !isAdmin)
    return (
      <main style={pageStyle}>
        <p role="status">Memeriksa akses admin...</p>
      </main>
    );
  return (
    <main style={pageStyle}>
      <h1>Persetujuan pengajuan role</h1>
      <Feedback error={error} info={info} />
      <label style={fieldStyle}>
        Filter status
        <select
          onChange={(event) => setStatus(event.target.value as RequestStatus)}
          style={inputStyle}
          value={status}
        >
          <option value="pending">Menunggu</option>
          <option value="approved">Disetujui</option>
          <option value="rejected">Ditolak</option>
        </select>
      </label>
      {!requests ? <p role="status">Memuat pengajuan...</p> : null}
      {requests?.length === 0 ? <p>Tidak ada pengajuan untuk status ini.</p> : null}
      {requests?.map((request) => (
        <article key={request.id} style={cardStyle}>
          <h2>
            {request.requested_role === "coach" ? "Pengajuan Coach" : "Pengajuan Owner Lapangan"}
          </h2>
          <p>Pemohon: {request.applicant?.display_name ?? request.user_id}</p>
          <p>
            Status: {request.status} · {new Date(request.created_at).toLocaleString("id-ID")}
          </p>
          {request.note ? <p>Catatan: {request.note}</p> : null}
          <section aria-label="Bukti pengajuan">
            <h3>Bukti</h3>
            {request.evidence.map((item, index) => (
              <EvidenceView item={item} key={`${item.type}-${index}`} />
            ))}
          </section>
          {request.status === "pending" ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
              <button
                disabled={busyId === request.id}
                onClick={() => void review(request, "approve")}
                style={buttonStyle}
                type="button"
              >
                Setujui
              </button>
              <input
                aria-label={`Alasan penolakan untuk ${
                  request.applicant?.display_name ?? request.id
                }`}
                maxLength={1000}
                onChange={(event) =>
                  setReasonById((current) => ({ ...current, [request.id]: event.target.value }))
                }
                placeholder="Alasan penolakan"
                style={inputStyle}
                value={reasonById[request.id] ?? ""}
              />
              <button
                disabled={busyId === request.id}
                onClick={() => void review(request, "reject")}
                style={buttonStyle}
                type="button"
              >
                Tolak
              </button>
            </div>
          ) : request.rejection_reason ? (
            <p>Alasan: {request.rejection_reason}</p>
          ) : null}
        </article>
      ))}
      {nextCursor ? (
        <button
          disabled={requests === null}
          onClick={() => void loadRequests(status, nextCursor, true)}
          style={{ ...buttonStyle, marginTop: 16 }}
          type="button"
        >
          Muat lebih banyak
        </button>
      ) : null}
    </main>
  );
}
