"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ErrorNote, errorMessage, Loading, useAction } from "@/modules/payments";
import { devicesApi } from "../api";
import { offlineQueue } from "../offlineQueue";
import { useSessionLive } from "../useSessionLive";

/**
 * Panjang satu segmen. Satu segmen = satu siklus start/stop MediaRecorder supaya setiap file bisa
 * diputar sendiri (docs/decisions/video-segment-format.md). TODO(decision): angka final dari uji.
 */
const SEGMENT_MS = 30_000;
/** Bitrate menjaga 30 detik 1080p jauh di bawah 50 MB. */
const VIDEO_BPS = 8_000_000;
const HEARTBEAT_MS = 10_000;
const OFFLINE_LABEL = "Jaringan device terputus. Analisa akan dilanjutkan otomatis saat terhubung ke internet.";

function pickMimeType(): "video/webm" | "video/mp4" | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const t of ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"]) {
    if (MediaRecorder.isTypeSupported(t)) return "video/webm";
  }
  return MediaRecorder.isTypeSupported("video/mp4") ? "video/mp4" : null;
}

interface BatteryLike {
  level: number;
  charging: boolean;
}

export function CameraScreen({ sessionId }: { sessionId: string }) {
  const { session, error: sessionError, setSession } = useSessionLive(sessionId);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingRef = useRef(false);
  const startedAtRef = useRef(0);
  const seqRef = useRef(0);
  const flushingRef = useRef(false);

  const [agreed, setAgreed] = useState(false);
  const [recording, setRecording] = useState(false);
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [battery, setBattery] = useState<BatteryLike | null>(null);
  const consent = useAction();
  const mimeType = pickMimeType();

  /** Kirim antrean berurutan; berhenti di kegagalan pertama dan coba lagi saat online. */
  const flush = useCallback(async () => {
    if (flushingRef.current) return;
    flushingRef.current = true;
    try {
      for (const seg of await offlineQueue.list(sessionId)) {
        const signed = await devicesApi.signSegmentUpload(sessionId, {
          seq: seg.seq,
          sizeBytes: seg.blob.size,
          mimeType: seg.mimeType,
          startOffsetMs: seg.startOffsetMs,
          durationMs: seg.durationMs,
        });
        await devicesApi.uploadToSignedUrl(signed, seg.blob);
        await devicesApi.markSegmentUploaded(sessionId, signed.segmentId);
        await offlineQueue.remove(seg.key); // hapus dari device setelah terkirim
      }
      setOnline(true);
    } catch {
      setOnline(false);
    } finally {
      flushingRef.current = false;
      setPending((await offlineQueue.list(sessionId)).length);
    }
  }, [sessionId]);

  // Kamera: minta izin, tampilkan pratinjau, laporkan kemampuan.
  useEffect(() => {
    let cancelled = false;
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 }, facingMode: "environment" },
          audio: false,
        });
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        const s = stream.getVideoTracks()[0]?.getSettings() ?? {};
        const nav = navigator as Navigator & {
          getBattery?: () => Promise<BatteryLike>;
          connection?: { effectiveType?: string };
          gpu?: unknown;
        };
        const bat = nav.getBattery ? await nav.getBattery().catch(() => null) : null;
        if (bat) setBattery({ level: bat.level, charging: bat.charging });
        await devicesApi.reportCapability(sessionId, {
          width: s.width ?? 0,
          height: s.height ?? 0,
          fps: s.frameRate ?? 0,
          webgpu: "gpu" in nav,
          ...(nav.connection?.effectiveType ? { connection: nav.connection.effectiveType } : {}),
          ...(bat ? { batteryLevel: bat.level, charging: bat.charging } : {}),
        });
      } catch (e) {
        setCameraError(errorMessage(e));
      }
    }
    void start();
    return () => {
      cancelled = true;
      recordingRef.current = false;
      recorderRef.current?.state === "recording" && recorderRef.current.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [sessionId]);

  // Heartbeat, deteksi jaringan, dan kirim sisa antrean dari sesi sebelumnya.
  useEffect(() => {
    void flush();
    const beat = window.setInterval(() => void devicesApi.heartbeat(sessionId).catch(() => setOnline(false)), HEARTBEAT_MS);
    const goOnline = () => void flush();
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.clearInterval(beat);
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [sessionId, flush]);

  function recordSegment() {
    const stream = streamRef.current;
    if (!stream || !mimeType || !recordingRef.current) return;
    const seq = seqRef.current++;
    const segStart = Date.now();
    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: VIDEO_BPS });
    recorderRef.current = recorder;
    recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
    recorder.onstop = () => {
      // Segmen berikutnya langsung dimulai supaya celah sekecil mungkin.
      if (recordingRef.current) recordSegment();
      const blob = new Blob(chunks, { type: mimeType });
      if (blob.size === 0) return;
      void offlineQueue
        .put({
          key: `${sessionId}:${seq}`,
          sessionId,
          seq,
          blob,
          mimeType,
          // TODO(integration): offset relatif awal rekaman, belum diselaraskan dengan timer match.
          startOffsetMs: segStart - startedAtRef.current,
          durationMs: Math.max(1, Date.now() - segStart),
        })
        .then(() => flush())
        .catch((e: unknown) => setCameraError(errorMessage(e)));
    };
    recorder.start();
    window.setTimeout(() => recorder.state === "recording" && recorder.stop(), SEGMENT_MS);
  }

  function startRecording() {
    startedAtRef.current = Date.now();
    recordingRef.current = true;
    setRecording(true);
    recordSegment();
  }

  function stopRecording() {
    recordingRef.current = false;
    setRecording(false);
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  async function giveConsent() {
    const s = await consent.run(() => devicesApi.recordConsent(sessionId));
    if (s) setSession(s);
  }

  if (!session) return sessionError ? <ErrorNote message={sessionError} /> : <Loading />;

  return (
    <>
      <video ref={videoRef} autoPlay muted playsInline style={{ width: "100%", background: "#000", borderRadius: 8 }} />
      <ErrorNote message={cameraError} />
      {!mimeType && <ErrorNote message="Browser ini tidak mendukung perekaman video (MediaRecorder)." />}

      {!online && (
        <p role="status" style={{ background: "#fff3cd", color: "#664d03", padding: 8, borderRadius: 8 }}>
          {OFFLINE_LABEL}
        </p>
      )}
      <p>
        Segmen menunggu dikirim: {pending}
        {battery && ` · Baterai ${Math.round(battery.level * 100)}%${battery.charging ? " (mengisi)" : ""}`}
      </p>

      {!session.consentAt ? (
        <section aria-label="Persetujuan pemain">
          <p>Semua pemain harus menyetujui sebelum direkam. Video hanya dipakai untuk deteksi lalu dihapus.</p>
          <label>
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} /> Pemain sudah
            menyetujui direkam
          </label>{" "}
          <button type="button" disabled={!agreed || consent.busy} onClick={giveConsent}>
            Simpan persetujuan
          </button>
          <ErrorNote message={consent.error} />
        </section>
      ) : recording ? (
        <button type="button" onClick={stopRecording}>
          Berhenti merekam
        </button>
      ) : (
        <button type="button" disabled={!mimeType || !!cameraError} onClick={startRecording}>
          Mulai merekam
        </button>
      )}
    </>
  );
}
