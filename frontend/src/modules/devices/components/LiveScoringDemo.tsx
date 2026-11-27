"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type FormEvent, type ChangeEvent } from "react";
import { env } from "@/lib/env";
import styles from "./LiveScoringDemo.module.css";

type DeviceRole = "controller" | "pair";
type Side = "home" | "away";
type Sport = "badminton" | "basketball" | "futsal" | "padel" | "tennis";
type SourceType = "camera" | "video";

interface Detection {
  classId: number;
  label: string;
  confidence: number;
  box: [number, number, number, number];
}

interface InferenceResult {
  type: "inference";
  sport: Sport;
  inferenceMs: number;
  frameSize: { width: number; height: number };
  detections: Detection[];
  scoring: "not_available";
}

interface DemoEvent {
  id: number;
  time: string;
  label: string;
  confidence: number;
}

const SPORTS: { id: Sport; label: string }[] = [
  { id: "badminton", label: "Badminton" },
  { id: "basketball", label: "Basket" },
  { id: "futsal", label: "Futsal" },
  { id: "padel", label: "Padel" },
  { id: "tennis", label: "Tenis" },
];

const INITIAL_SCORE = { home: 0, away: 0 };

function serviceSocketUrl(sport: Sport, pin: string, role: "camera" | "coach"): string {
  const url = new URL(env.yoloServiceUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = `/live/${sport}/${pin}`;
  url.searchParams.set("role", role);
  return url.toString();
}

function sportLabel(sport: Sport): string {
  return SPORTS.find((item) => item.id === sport)?.label ?? sport;
}

function formatClock(totalSeconds: number): string {
  return `${String(Math.floor(totalSeconds / 60)).padStart(2, "0")}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "Terjadi kesalahan yang tidak diketahui.";
}

function ScoreBoard({
  score,
  onPoint,
}: {
  score: { home: number; away: number };
  onPoint: (side: Side) => void;
}) {
  return (
    <div
      aria-atomic="true"
      aria-label={`Skor ${score.home} lawan ${score.away}`}
      aria-live="polite"
      className={styles.scoreBoard}
    >
      {(["home", "away"] as const).map((side, index) => (
        <div key={side}>
          <span className={styles.teamLabel}>{side === "home" ? "Tuan rumah" : "Tamu"}</span>
          <strong aria-label={`Skor ${side === "home" ? "tuan rumah" : "tamu"}`}>
            {score[side]}
          </strong>
          <button
            aria-label={`Tambah poin ${side === "home" ? "tuan rumah" : "tamu"}`}
            className={styles.scoreButton}
            onClick={() => onPoint(side)}
            type="button"
          >
            +1 poin
          </button>
          {index === 0 && (
            <span aria-hidden="true" className={styles.scoreDivider}>
              :
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function EventList({ events }: { events: DemoEvent[] }) {
  return (
    <section aria-label="Hasil deteksi YOLO" className={styles.events}>
      <div className={styles.sectionHeading}>
        <h3>Deteksi YOLO terbaru</h3>
        <span>{events.length} objek</span>
      </div>
      {events.length === 0 ? (
        <p className={styles.emptyEvents}>Belum ada objek terdeteksi dari sumber video.</p>
      ) : (
        <ol className={styles.eventList}>
          {events.map((event) => (
            <li className={styles.event} key={event.id}>
              <span aria-hidden="true" className={styles.eventIcon}>
                ●
              </span>
              <span className={styles.eventDescription}>
                <strong>{event.label}</strong>
                <span>Keyakinan {(event.confidence * 100).toFixed(0)}%</span>
              </span>
              <time>{event.time}</time>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function LiveScoringDemo({ allowVideoUpload }: { allowVideoUpload: boolean }) {
  const [deviceRole, setDeviceRole] = useState<DeviceRole>("controller");
  const [sport, setSport] = useState<Sport>("badminton");
  const [score, setScore] = useState(INITIAL_SCORE);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [matchRunning, setMatchRunning] = useState(true);
  const [pin, setPin] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [cameraSide, setCameraSide] = useState<Side>("home");
  const [cameraConnected, setCameraConnected] = useState(false);
  const [cameraRunning, setCameraRunning] = useState(false);
  const [sourceType, setSourceType] = useState<SourceType>("camera");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [serviceStatus, setServiceStatus] = useState("Menghubungkan layanan YOLO…");
  const [serviceError, setServiceError] = useState("");
  const [latest, setLatest] = useState<InferenceResult | null>(null);
  const [events, setEvents] = useState<DemoEvent[]>([]);
  const [notice, setNotice] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const coachSocket = useRef<WebSocket | null>(null);
  const cameraSocket = useRef<WebSocket | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const eventSequence = useRef(0);
  const framePending = useRef(false);
  const frameTimes = useRef<number[]>([]);
  const [streamFps, setStreamFps] = useState(0);
  const isController = deviceRole === "controller";

  const handleServiceMessage = useCallback(
    (data: unknown) => {
      if (typeof data !== "object" || data === null || !("type" in data)) return;
      const message = data as Record<string, unknown>;
      if (message.type === "error") {
        setServiceError(
          typeof message.message === "string" ? message.message : "Layanan YOLO gagal.",
        );
        return;
      }
      if (message.type === "connected") {
        setServiceStatus("Terhubung ke layanan YOLO");
        setServiceError("");
        return;
      }
      if (message.type === "ready") {
        setServiceStatus(`Model ${sportLabel(sport)} siap`);
        setServiceError("");
        return;
      }
      if (message.type !== "inference") return;
      const result = message as unknown as InferenceResult;
      framePending.current = false;
      setLatest(result);
      const now = performance.now();
      frameTimes.current = [...frameTimes.current.filter((time) => now - time < 2000), now];
      if (frameTimes.current.length > 1) {
        const span = now - (frameTimes.current[0] ?? now);
        setStreamFps(Math.round(((frameTimes.current.length - 1) * 1000) / span));
      }
      if (result.detections.length > 0) {
        const sequence = eventSequence.current++;
        const best = result.detections.reduce((left, right) =>
          right.confidence > left.confidence ? right : left,
        );
        setEvents((current) =>
          [
            {
              id: sequence,
              time: new Date().toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              }),
              label: best.label,
              confidence: best.confidence,
            },
            ...current,
          ].slice(0, 5),
        );
        setServiceStatus(`YOLO mendeteksi ${result.detections.length} objek`);
      } else {
        setServiceStatus("Terhubung · tidak ada objek terdeteksi");
      }
    },
    [sport],
  );

  useEffect(() => {
    const values = new Uint32Array(1);
    window.crypto.getRandomValues(values);
    setPin(String(100000 + ((values[0] ?? 0) % 900000)));
    const handleFullscreenChange = () => setFullscreen(document.fullscreenElement !== null);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (!pin || !isController) return;
    setServiceStatus("Menghubungkan Controller ke layanan YOLO…");
    const socket = new WebSocket(serviceSocketUrl(sport, pin, "coach"));
    coachSocket.current = socket;
    socket.onopen = () => setServiceStatus("Controller terhubung · menunggu Pair Device");
    socket.onmessage = (event) => {
      try {
        handleServiceMessage(JSON.parse(event.data));
      } catch {
        setServiceError("Respons layanan YOLO tidak valid.");
      }
    };
    socket.onerror = () => setServiceError("Layanan YOLO tidak dapat dijangkau.");
    socket.onclose = () => {
      if (coachSocket.current === socket) setServiceStatus("Koneksi YOLO terputus");
    };
    return () => {
      coachSocket.current = null;
      socket.close();
    };
  }, [handleServiceMessage, isController, pin, sport]);

  useEffect(() => {
    if (!cameraRunning) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const socket = cameraSocket.current;
    const context = canvas?.getContext("2d");
    if (!video || !canvas || !context || !socket) return;
    const timer = window.setInterval(() => {
      if (
        video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
        video.videoWidth === 0 ||
        socket.readyState !== WebSocket.OPEN
      ) {
        return;
      }
      const ratio = Math.min(1, 640 / video.videoWidth);
      canvas.width = Math.round(video.videoWidth * ratio);
      canvas.height = Math.round(video.videoHeight * ratio);
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        async (blob) => {
          if (
            !blob ||
            framePending.current ||
            socket.readyState !== WebSocket.OPEN ||
            socket.bufferedAmount > 1_000_000
          ) {
            return;
          }
          try {
            framePending.current = true;
            socket.send(await blob.arrayBuffer());
          } catch (error) {
            framePending.current = false;
            setServiceError(`Frame gagal dikirim: ${errorText(error)}`);
          }
        },
        "image/jpeg",
        0.72,
      );
    }, 200);
    return () => window.clearInterval(timer);
  }, [cameraRunning]);

  useEffect(() => {
    if (!matchRunning) return;
    const timer = window.setInterval(() => setElapsedSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [matchRunning]);

  useEffect(
    () => () => {
      cameraSocket.current?.close();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  useEffect(
    () => () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    },
    [videoUrl],
  );

  function connectCameraSocket(sessionPin: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(serviceSocketUrl(sport, sessionPin, "camera"));
      cameraSocket.current = socket;
      let opened = false;
      socket.onmessage = (message) => {
        try {
          handleServiceMessage(JSON.parse(message.data));
        } catch {
          setServiceError("Respons layanan YOLO tidak valid.");
        }
      };
      socket.onerror = () => {
        const error = new Error("Tidak dapat terhubung ke layanan YOLO. Periksa alamat layanan.");
        setServiceError(error.message);
        if (!opened) reject(error);
      };
      socket.onclose = () => {
        if (cameraSocket.current === socket) {
          cameraSocket.current = null;
          setCameraConnected(false);
          setCameraRunning(false);
          setServiceStatus("Koneksi perangkat terputus");
        }
        if (!opened) reject(new Error("Pair Device tidak terhubung. Periksa PIN Controller."));
      };
      socket.onopen = () => {
        opened = true;
        setCameraConnected(true);
        setServiceStatus("Pair Device terhubung · memuat model YOLO");
        setServiceError("");
        resolve();
      };
    });
  }

  async function connectPairDevice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanPin = pinInput.replace(/\D/g, "");
    if (cleanPin.length !== 6) {
      setServiceError("Masukkan PIN Controller enam digit.");
      return;
    }
    setServiceError("");
    setServiceStatus("Menghubungkan Pair Device…");
    try {
      await connectCameraSocket(cleanPin);
    } catch (error) {
      setServiceError(errorText(error));
    }
  }

  async function startCamera() {
    try {
      if (!cameraSocket.current || cameraSocket.current.readyState !== WebSocket.OPEN) {
        throw new Error("Hubungkan Pair Device ke Controller terlebih dahulu.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      setSourceType("camera");
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraRunning(true);
      setServiceError("");
      setNotice("Kamera aktif. Frame dikirim langsung ke layanan YOLO.");
    } catch (error) {
      setServiceError(`Kamera tidak dapat dimulai: ${errorText(error)}`);
    }
  }

  function stopSource(closeConnection = false) {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    videoRef.current?.pause();
    setCameraRunning(false);
    framePending.current = false;
    if (closeConnection) {
      cameraSocket.current?.close();
      cameraSocket.current = null;
      setCameraConnected(false);
    }
  }

  async function selectVideo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    stopSource(true);
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoFile(file);
    setVideoUrl(URL.createObjectURL(file));
    setSourceType("video");
    setServiceError("");
  }

  async function startVideoSimulation() {
    if (!allowVideoUpload) return;
    if (!videoFile || !videoUrl) {
      setServiceError("Pilih file video terlebih dahulu.");
      return;
    }
    try {
      if (coachSocket.current?.readyState !== WebSocket.OPEN) {
        throw new Error("Tunggu Controller terhubung ke layanan YOLO.");
      }
      await connectCameraSocket(pin);
      if (!videoRef.current) throw new Error("Pratinjau video belum siap.");
      videoRef.current.currentTime = 0;
      videoRef.current.playbackRate = 1;
      await videoRef.current.play();
      setSourceType("video");
      setCameraRunning(true);
      setServiceError("");
      setNotice("Video dikirim per frame ke YOLO mengikuti kecepatan realtime.");
    } catch (error) {
      setServiceError(`Video tidak dapat dikirim: ${errorText(error)}`);
    }
  }

  function onVideoEnded() {
    stopSource(true);
    setNotice("Simulasi video selesai.");
  }

  function disconnectPairDevice() {
    stopSource(true);
    setLatest(null);
    setEvents([]);
    setServiceError("");
  }

  function changeRole(role: DeviceRole) {
    if (role === deviceRole) return;
    stopSource(true);
    setServiceError("");
    setNotice("");
    setDeviceRole(role);
  }

  function changeSport(value: Sport) {
    if (value === sport) return;
    stopSource(true);
    setLatest(null);
    setEvents([]);
    setSport(value);
  }

  async function copyPin() {
    try {
      await navigator.clipboard.writeText(pin);
      setNotice("PIN Controller berhasil disalin.");
    } catch {
      setNotice("Tidak dapat menyalin PIN. Masukkan kode secara manual.");
    }
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      setNotice("Mode layar penuh tidak tersedia di browser ini.");
    }
  }

  function resetDemo() {
    stopSource(true);
    setScore(INITIAL_SCORE);
    setElapsedSeconds(0);
    setMatchRunning(true);
    setEvents([]);
    setLatest(null);
    setServiceError("");
    setNotice("Sesi diatur ulang.");
    eventSequence.current = 0;
  }

  const statusOnline =
    serviceStatus.toLowerCase().includes("terhubung") ||
    serviceStatus.includes("mendeteksi") ||
    serviceStatus.toLowerCase().includes("siap");

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <a aria-label="Peluit, kembali ke beranda" className={styles.brand} href="/">
          <Image
            alt=""
            className={styles.brandMark}
            height={1313}
            priority
            src="/brand/peluit-mark.png"
            width={882}
          />
          <span>ELUIT</span>
        </a>
        <div className={styles.topbarTitle}>
          <strong>Skor langsung</strong>
          <span className={styles.demoBadge}>MODE DEVELOPMENT</span>
        </div>
        <div className={styles.topbarActions}>
          <button className={styles.secondaryButton} onClick={resetDemo} type="button">
            Reset sesi
          </button>
          <button
            aria-label={fullscreen ? "Keluar dari layar penuh" : "Buka layar penuh"}
            className={styles.iconButton}
            onClick={toggleFullscreen}
            type="button"
          >
            {fullscreen ? "Kecilkan" : "Layar penuh"}
          </button>
        </div>
      </header>

      <nav aria-label="Peran perangkat" className={styles.roleNav}>
        <button
          aria-pressed={isController}
          className={isController ? styles.modeActive : ""}
          onClick={() => changeRole("controller")}
          type="button"
        >
          Controller
        </button>
        <button
          aria-pressed={!isController}
          className={!isController ? styles.modeActive : ""}
          onClick={() => changeRole("pair")}
          type="button"
        >
          Pair Device
        </button>
        <span className={styles.navHint}>
          {isController ? `PIN sesi ${pin || "······"}` : "Pasangkan kamera ke Controller"}
        </span>
      </nav>

      <div className={styles.demoNotice} role="note">
        Kamera atau video development mengirim frame langsung ke YOLO. Deteksi objek belum otomatis
        menjadi poin.
      </div>

      {isController ? (
        <div className={styles.desktopGrid}>
          <section className={styles.mainColumn}>
            <section className={styles.matchCard}>
              <div className={styles.matchHeader}>
                <div>
                  <label className={styles.eyebrow} htmlFor="controller-sport">
                    CABANG OLAHRAGA
                  </label>
                  <select
                    className={styles.sportSelect}
                    id="controller-sport"
                    onChange={(event) => changeSport(event.target.value as Sport)}
                    value={sport}
                  >
                    {SPORTS.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  <h1>Controller pertandingan</h1>
                </div>
                <span className={matchRunning ? styles.livePill : styles.pausedPill}>
                  <span /> {matchRunning ? "Live" : "Dijeda"}
                </span>
              </div>
              <div className={styles.desktopScore}>
                <ScoreBoard
                  onPoint={(side) =>
                    setScore((current) => ({ ...current, [side]: current[side] + 1 }))
                  }
                  score={score}
                />
                <div className={styles.clock}>{formatClock(elapsedSeconds)}</div>
                <p className={styles.scoreMeta}>Poin dikontrol Coach · YOLO mendeteksi objek</p>
              </div>
              <div className={styles.processingPanel}>
                <span className={statusOnline ? styles.connectedDot : styles.disconnectedDot} />
                <div>
                  <strong>{serviceStatus}</strong>
                  <small>
                    {latest
                      ? `${latest.detections.length} objek · ${latest.inferenceMs} ms · ${latest.frameSize.width}×${latest.frameSize.height}`
                      : "Menunggu frame dari Pair Device atau video"}
                  </small>
                </div>
                <span className={styles.fpsValue}>{streamFps} FPS</span>
              </div>
              <div className={styles.matchActions}>
                <button
                  className={styles.secondaryButton}
                  onClick={() => setMatchRunning((running) => !running)}
                  type="button"
                >
                  {matchRunning ? "Jeda pertandingan" : "Lanjutkan pertandingan"}
                </button>
                <span className={statusOnline ? styles.aiActive : styles.aiIdle}>
                  <span /> YOLO {statusOnline ? "terhubung" : "menunggu"}
                </span>
              </div>
            </section>

            {allowVideoUpload && (
              <section className={`${styles.panel} ${styles.videoPanel}`}>
                <div className={styles.sectionHeading}>
                  <h2>Uji video sebagai realtime</h2>
                  <span>Development saja</span>
                </div>
                <p className={styles.panelHint}>
                  Video diputar normal; frame dikirim satu per satu ke layanan YOLO, bukan diunggah
                  sebagai satu file.
                </p>
                <input
                  accept="video/*"
                  className={styles.fileInput}
                  id="demo-video"
                  onChange={(event) => void selectVideo(event)}
                  type="file"
                />
                <label className={styles.fileButton} htmlFor="demo-video">
                  Pilih video
                </label>
                {videoFile && (
                  <>
                    <p className={styles.fileName}>{videoFile.name}</p>
                    <div className={styles.videoStage}>
                      <video
                        controls
                        onEnded={onVideoEnded}
                        playsInline
                        ref={videoRef}
                        src={videoUrl}
                      />
                    </div>
                    <canvas aria-hidden="true" className={styles.captureCanvas} ref={canvasRef} />
                    <button
                      className={styles.primaryButton}
                      disabled={cameraRunning}
                      onClick={() => void startVideoSimulation()}
                      type="button"
                    >
                      {cameraRunning && sourceType === "video"
                        ? "Video sedang dianalisis"
                        : "Mulai simulasi realtime"}
                    </button>
                  </>
                )}
              </section>
            )}
          </section>

          <aside className={styles.sideColumn}>
            <section className={styles.panel}>
              <div className={styles.sectionHeading}>
                <h2>Pair Device</h2>
                <span>{cameraConnected ? "Terhubung" : "Menunggu"}</span>
              </div>
              <div className={styles.pinPanel}>
                <span className={styles.pinLabel}>PIN Controller</span>
                <strong className={styles.pinCode}>{pin || "······"}</strong>
                <button className={styles.secondaryButton} onClick={copyPin} type="button">
                  Salin PIN
                </button>
                <p>
                  Buka homepage di HP kamera, pilih Pair Device, lalu masukkan PIN dan olahraga yang
                  sama.
                </p>
              </div>
            </section>
            <section className={styles.panel}>
              <div className={styles.sectionHeading}>
                <h2>Status YOLO</h2>
                <span>{sportLabel(sport)}</span>
              </div>
              <div className={styles.metricRow}>
                <span>Inferensi per frame</span>
                <strong>{latest ? `${latest.inferenceMs} ms` : "—"}</strong>
              </div>
              <div className={styles.metricRow}>
                <span>Objek terdeteksi</span>
                <strong>{latest?.detections.length ?? 0}</strong>
              </div>
              <div className={styles.metricRow}>
                <span>Model yang digunakan</span>
                <strong>{sport === "badminton" ? "YOLO badminton" : "YOLO COCO"}</strong>
              </div>
              <p className={styles.panelHint}>
                Cabang tanpa bobot khusus memakai model COCO umum untuk mencari bola. Skor tetap
                dikontrol Controller.
              </p>
            </section>
            <EventList events={events} />
            {(serviceError || notice) && (
              <p
                className={serviceError ? styles.serviceError : styles.notice}
                role={serviceError ? "alert" : "status"}
              >
                {serviceError || notice}
              </p>
            )}
          </aside>
        </div>
      ) : (
        <section className={`${styles.pairShell} ${styles.cameraPhone}`}>
          <div className={styles.pairHeader}>
            <span className={styles.cameraGlyph}>↔</span>
            <p className={styles.eyebrow}>PERANGKAT KAMERA</p>
            <h1>Pair Device</h1>
            <p>
              Hubungkan perangkat ini ke Controller. Kamera HP akan mengirim frame langsung ke YOLO.
            </p>
          </div>
          {!cameraConnected ? (
            <form className={styles.pairForm} onSubmit={connectPairDevice}>
              <label htmlFor="pair-sport">Cabang olahraga</label>
              <select
                className={styles.sportSelect}
                id="pair-sport"
                onChange={(event) => changeSport(event.target.value as Sport)}
                value={sport}
              >
                {SPORTS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
              <span className={styles.pairRoleLabel}>Sisi kamera</span>
              <div aria-label="Sisi kamera" className={styles.sideOptions} role="radiogroup">
                {(["home", "away"] as const).map((side) => (
                  <button
                    aria-pressed={cameraSide === side}
                    className={cameraSide === side ? styles.sideOptionActive : ""}
                    key={side}
                    onClick={() => setCameraSide(side)}
                    type="button"
                  >
                    {side === "home" ? "Kamera utama" : "Kamera kedua"}
                  </button>
                ))}
              </div>
              <label htmlFor="device-pin">PIN Controller</label>
              <input
                autoComplete="one-time-code"
                id="device-pin"
                inputMode="numeric"
                maxLength={6}
                onChange={(event) => {
                  setPinInput(event.target.value.replace(/\D/g, "").slice(0, 6));
                  setServiceError("");
                }}
                placeholder="Masukkan 6 digit PIN"
                value={pinInput}
              />
              {serviceError && (
                <p className={styles.formError} role="alert">
                  {serviceError}
                </p>
              )}
              <button
                className={styles.primaryButton}
                disabled={pinInput.length !== 6}
                type="submit"
              >
                Hubungkan perangkat
              </button>
              <p className={styles.pairHint}>
                Izinkan akses kamera setelah tersambung. Browser HP memerlukan HTTPS atau localhost
                untuk mengakses kamera.
              </p>
            </form>
          ) : (
            <div className={styles.cameraSession}>
              <div className={styles.sectionHeading}>
                <h2>
                  {sportLabel(sport)} · {cameraSide === "home" ? "Kamera utama" : "Kamera kedua"}
                </h2>
                <span className={cameraRunning ? styles.livePill : styles.pausedPill}>
                  <span /> {cameraRunning ? "Live" : "Siap"}
                </span>
              </div>
              <div className={styles.videoStage}>
                <video autoPlay muted playsInline ref={videoRef} />
                {!cameraRunning && <span>Pratinjau kamera akan tampil di sini</span>}
                {latest?.detections.map((detection, index) => {
                  const [x1, y1, x2, y2] = detection.box;
                  const width = latest.frameSize.width || 1;
                  const height = latest.frameSize.height || 1;
                  return (
                    <span
                      aria-label={`${detection.label}, keyakinan ${(detection.confidence * 100).toFixed(0)} persen`}
                      className={styles.detectionBox}
                      key={`${index}-${detection.classId}`}
                      style={{
                        left: `${(x1 / width) * 100}%`,
                        top: `${(y1 / height) * 100}%`,
                        width: `${((x2 - x1) / width) * 100}%`,
                        height: `${((y2 - y1) / height) * 100}%`,
                      }}
                    >
                      {detection.label} {(detection.confidence * 100).toFixed(0)}%
                    </span>
                  );
                })}
              </div>
              <canvas aria-hidden="true" className={styles.captureCanvas} ref={canvasRef} />
              <div className={styles.cameraStatus}>
                <span className={cameraRunning ? styles.connectedDot : styles.disconnectedDot} />
                <span>{cameraRunning ? serviceStatus : "Terhubung · kamera belum dimulai"}</span>
              </div>
              {serviceError && (
                <p className={styles.serviceError} role="alert">
                  {serviceError}
                </p>
              )}
              <button
                className={styles.primaryButton}
                onClick={() => void (cameraRunning ? Promise.resolve(stopSource()) : startCamera())}
                type="button"
              >
                {cameraRunning ? "Hentikan kamera" : "Mulai kamera"}
              </button>
              <div className={styles.cameraStats}>
                <span>
                  <strong>{streamFps}</strong> FPS aktual
                </span>
                <span>
                  <strong>{latest ? `${latest.inferenceMs} ms` : "—"}</strong> inferensi
                </span>
                <span>
                  <strong>{latest?.detections.length ?? 0}</strong> objek
                </span>
              </div>
              <EventList events={events} />
              <button className={styles.textButton} onClick={disconnectPairDevice} type="button">
                Putuskan perangkat
              </button>
            </div>
          )}
        </section>
      )}

      {(serviceError || notice) && isController && (
        <p
          className={serviceError ? styles.serviceError : styles.notice}
          role={serviceError ? "alert" : "status"}
        >
          {serviceError || notice}
        </p>
      )}
      <footer className={styles.footerNote}>
        Satu homepage responsif untuk Controller atau Pair Device. Produksi memakai kamera langsung;
        unggah video hanya tersedia di development.
      </footer>
    </main>
  );
}
