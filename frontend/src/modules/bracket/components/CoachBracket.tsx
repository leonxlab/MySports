"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ApiError } from "@/lib/api-client";
import { matchApi } from "@/modules/match";
import { openPlayApi } from "@/modules/open-play";
import { FocusShell, focusStyles } from "@/components/feed";
import { useAction, useLoad } from "@/modules/payments";
import { bracketApi } from "../api";
import type { BracketMode, BracketMatchView, BracketRoundView, BracketView } from "../types";
import { nameOf, type Picked } from "./BracketBoard";
import styles from "./CoachBracket.module.css";

const modes: { value: BracketMode; label: string }[] = [
  { value: "singles", label: "Tunggal" },
  { value: "doubles", label: "Ganda" },
  { value: "team", label: "Tim" },
];

const avatarColors = ["#0ea5e9", "#db2777", "#ea7a18", "#9333a7", "#0f9f88"];

function formatClock(date: Date) {
  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function roundTimeRange(
  startAt: string | undefined,
  round: BracketRoundView,
  bracket: BracketView,
) {
  if (!startAt) return null;
  const sessionStart = Date.parse(startAt);
  if (!Number.isFinite(sessionStart)) return null;
  const offset = (round.round - 1) * (bracket.matchMinutes + bracket.breakMinutes);
  const start = new Date(sessionStart + offset * 60_000);
  const end = new Date(start.getTime() + bracket.matchMinutes * 60_000);
  return `${formatClock(start)} – ${formatClock(end)}`;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className={styles.settingRow}>
      <span>{label}</span>
      <div className={styles.stepper}>
        <button
          aria-label={`Kurangi ${label.toLowerCase()}`}
          className={styles.stepButton}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          type="button"
        >
          −
        </button>
        <strong aria-live="polite">{value}</strong>
        <button
          aria-label={`Tambah ${label.toLowerCase()}`}
          className={styles.stepButton}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          type="button"
        >
          +
        </button>
      </div>
    </div>
  );
}

export function CoachBracket({ openPlayId }: { openPlayId: string }) {
  const bracket = useLoad(async () => {
    try {
      return await bracketApi.getByOpenPlay(openPlayId);
    } catch (e) {
      if (e instanceof ApiError && e.code === "BRACKET_NOT_FOUND") return null;
      throw e;
    }
  }, [openPlayId]);
  const people = useLoad(() => openPlayApi.listParticipants(openPlayId), [openPlayId]);
  const session = useLoad(() => openPlayApi.get(openPlayId), [openPlayId]);
  const names = useMemo(
    () => new Map((people.data ?? []).map((person) => [person.id, person.displayName])),
    [people.data],
  );

  const [mode, setMode] = useState<BracketMode>("doubles");
  const [courtCount, setCourtCount] = useState(1);
  const [matchMinutes, setMatchMinutes] = useState(15);
  const [breakMinutes, setBreakMinutes] = useState(2);
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [activeRoundIndex, setActiveRoundIndex] = useState(0);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [createdMatches, setCreatedMatches] = useState<Record<string, string>>({});
  const initializedBracketId = useRef<string | null>(null);
  const { busy, error, run } = useAction();
  const currentBracket = bracket.data;

  useEffect(() => {
    if (!currentBracket || initializedBracketId.current === currentBracket.id) return;
    initializedBracketId.current = currentBracket.id;
    setMode(currentBracket.mode);
    setCourtCount(currentBracket.courtCount);
    setMatchMinutes(currentBracket.matchMinutes);
    setBreakMinutes(currentBracket.breakMinutes);
  }, [currentBracket]);

  const rounds = currentBracket?.rounds ?? [];
  const activeRound = rounds[activeRoundIndex];
  const timeForRound = (round: BracketRoundView) =>
    currentBracket ? roundTimeRange(session.data?.startsAt, round, currentBracket) : null;
  const courtGroups = useMemo(() => {
    const groups = new Map<number, BracketMatchView[]>();
    for (const match of activeRound?.matches ?? []) {
      const courtMatches = groups.get(match.court) ?? [];
      courtMatches.push(match);
      groups.set(match.court, courtMatches);
    }
    return [...groups.entries()].sort(([a], [b]) => a - b);
  }, [activeRound]);
  const remainingMatches = activeRound
    ? activeRound.matches.filter((match) => !createdMatches[match.id])
    : [];
  const subtitle = currentBracket
    ? `${currentBracket.rounds.length} ronde · ${currentBracket.courtCount} lapangan · ${currentBracket.matchMinutes} mnt + jeda ${currentBracket.breakMinutes} · v${currentBracket.version}`
    : undefined;

  async function generate() {
    const result = await run(() =>
      bracketApi.generate({ openPlayId, mode, courtCount, matchMinutes, breakMinutes }),
    );
    if (result) {
      bracket.setData(result);
      setCreatedMatches({});
      setActiveRoundIndex(0);
      setPicked(null);
      setSettingsOpen(false);
    }
  }

  async function regenerate(current: BracketView) {
    if (!window.confirm("Buat ulang bagan? Susunan sekarang diganti.")) return;
    const result = await run(() =>
      bracketApi.regenerate(current.id, { mode, courtCount, matchMinutes, breakMinutes }),
    );
    if (result) {
      bracket.setData(result);
      setCreatedMatches({});
      setPicked(null);
      setActiveRoundIndex(0);
      setSettingsOpen(false);
    }
  }

  async function createRoundMatches(round: BracketRoundView) {
    const toCreate = round.matches.filter((match) => !createdMatches[match.id]);
    if (!toCreate.length) return;
    await run(async () => {
      for (const match of toCreate) {
        const created = await matchApi.create({ bracketMatchId: match.id });
        setCreatedMatches((previous) => ({ ...previous, [match.id]: created.id }));
      }
    });
  }

  async function pick(current: BracketView, roundId: string, playerId: string) {
    if (!picked || picked.roundId !== roundId) {
      setPicked({ roundId, id: playerId });
      return;
    }
    if (picked.id === playerId) {
      setPicked(null);
      return;
    }
    const result = await run(() =>
      bracketApi.swap(current.id, { roundId, a: picked.id, b: playerId }),
    );
    if (result) bracket.setData(result);
    setPicked(null);
  }

  function renderPlayer(roundId: string, playerId: string, index: number) {
    const name = nameOf(names, playerId);
    const isPicked = picked?.roundId === roundId && picked.id === playerId;
    return (
      <button
        aria-label={isPicked ? `Batal memilih ${name}` : `Pilih ${name} untuk ditukar`}
        aria-pressed={isPicked}
        className={`${styles.player}${isPicked ? ` ${styles.playerPicked}` : ""}`}
        key={playerId}
        onClick={() =>
          activeRound && currentBracket && void pick(currentBracket, roundId, playerId)
        }
        type="button"
      >
        <span
          aria-hidden="true"
          className={styles.playerAvatar}
          style={{ backgroundColor: avatarColors[index % avatarColors.length] }}
        >
          {initials(name)}
        </span>
        <span>{name}</span>
      </button>
    );
  }

  const footerActions =
    currentBracket && activeRound ? (
      <div className={styles.stickyCta}>
        <button
          className={styles.createAllButton}
          disabled={busy || remainingMatches.length === 0}
          onClick={() => void createRoundMatches(activeRound)}
          type="button"
        >
          {busy
            ? "Memproses…"
            : remainingMatches.length
              ? `Buat semua pertandingan ronde ${activeRound.round}`
              : `Semua pertandingan ronde ${activeRound.round} sudah dibuat`}
        </button>
      </div>
    ) : undefined;

  return (
    <FocusShell
      actions={footerActions}
      backLabel="Kembali ke sesi open play"
      exitHref={`/coach/open-play/${openPlayId}`}
      headerAction={<span className={focusStyles.status}>Draf</span>}
      status="Draf"
      subtitle={subtitle}
      title="Bagan open play"
    >
      <div className={styles.page}>
        {bracket.error ? (
          <p className={styles.error} role="alert">
            {bracket.error}
          </p>
        ) : null}
        {people.error ? (
          <p className={styles.error} role="alert">
            Gagal memuat peserta: {people.error}
          </p>
        ) : null}
        {session.error ? (
          <p className={styles.error} role="alert">
            Gagal memuat jadwal open play: {session.error}
          </p>
        ) : null}
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}

        <section className={styles.settingsCard}>
          <button
            aria-expanded={settingsOpen}
            className={styles.settingsToggle}
            onClick={() => setSettingsOpen((open) => !open)}
            type="button"
          >
            <span>{currentBracket ? "Atur ulang bagan" : "Atur bagan"}</span>
            <svg
              aria-hidden="true"
              className={settingsOpen ? styles.chevronOpen : ""}
              fill="none"
              height="18"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
              viewBox="0 0 24 24"
              width="18"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {settingsOpen ? (
            <div className={styles.settingsBody}>
              <div className={styles.settingRow}>
                <span>Mode</span>
                <div aria-label="Mode pertandingan" className={styles.modeGroup} role="group">
                  {modes.map((item) => (
                    <button
                      aria-pressed={mode === item.value}
                      className={mode === item.value ? styles.modeActive : ""}
                      key={item.value}
                      onClick={() => setMode(item.value)}
                      type="button"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              <Stepper
                label="Lapangan"
                max={50}
                min={1}
                onChange={setCourtCount}
                value={courtCount}
              />
              <Stepper
                label="Menit per ronde"
                max={240}
                min={1}
                onChange={setMatchMinutes}
                value={matchMinutes}
              />
              <Stepper
                label="Jeda (menit)"
                max={120}
                min={0}
                onChange={setBreakMinutes}
                value={breakMinutes}
              />
              <button
                className={styles.regenerateButton}
                disabled={busy || bracket.loading}
                onClick={() => void (currentBracket ? regenerate(currentBracket) : generate())}
                type="button"
              >
                {busy ? "Memproses…" : currentBracket ? "Buat ulang bagan" : "Buat bagan"}
              </button>
              <p>Susunan dihitung server dari peserta yang sudah terkonfirmasi.</p>
            </div>
          ) : null}
        </section>

        {bracket.loading ? (
          <p className={styles.muted} role="status">
            Memuat bagan…
          </p>
        ) : null}
        {!bracket.loading && !currentBracket ? (
          <p className={styles.emptyState}>
            Bagan belum dibuat. Atur mode dan jumlah lapangan, lalu buat bagan.
          </p>
        ) : null}
        {currentBracket ? (
          <>
            <p className={styles.swapHint} role="status">
              {picked
                ? `${nameOf(names, picked.id)} dipilih. Ketuk pemain lain di ronde yang sama untuk menukar posisi.`
                : "Ketuk satu pemain, lalu ketuk pemain lain untuk menukar posisinya."}
            </p>

            <div aria-label="Pilih ronde" className={styles.roundTabs} role="tablist">
              {rounds.map((round, index) => {
                const time = timeForRound(round);
                return (
                  <button
                    aria-selected={activeRoundIndex === index}
                    className={`${styles.roundTab}${activeRoundIndex === index ? ` ${styles.roundTabActive}` : ""}`}
                    key={round.id}
                    onClick={() => {
                      setActiveRoundIndex(index);
                      setPicked(null);
                    }}
                    role="tab"
                    type="button"
                  >
                    <strong>Ronde {round.round}</strong>
                    {time ? <span>{time}</span> : null}
                  </button>
                );
              })}
            </div>

            {activeRound ? (
              <div className={styles.roundContent}>
                {courtGroups.map(([court, matches]) => {
                  const time = timeForRound(activeRound);
                  return (
                    <section className={styles.courtCard} key={court}>
                      <header className={styles.courtHeader}>
                        <h2>Lapangan {court}</h2>
                        {time ? <span>{time.split(" – ")[0]}</span> : null}
                      </header>
                      {matches.map((match) => (
                        <div className={styles.match} key={match.id}>
                          <div className={styles.team}>
                            <span className={styles.teamLabel}>Tim A</span>
                            {match.home.length ? (
                              match.home.map((playerId, index) =>
                                renderPlayer(activeRound.id, playerId, index),
                              )
                            ) : (
                              <span className={styles.muted}>Belum ditentukan</span>
                            )}
                          </div>
                          <div aria-hidden="true" className={styles.versus}>
                            <span />
                            Lawan
                            <span />
                          </div>
                          <div className={styles.team}>
                            <span className={styles.teamLabel}>Tim B</span>
                            {match.away.length ? (
                              match.away.map((playerId, index) =>
                                renderPlayer(activeRound.id, playerId, index),
                              )
                            ) : (
                              <span className={styles.muted}>Belum ditentukan</span>
                            )}
                          </div>
                          {createdMatches[match.id] ? (
                            <Link
                              className={styles.matchLink}
                              href={`/coach/match/${createdMatches[match.id]}`}
                            >
                              Buka pertandingan
                            </Link>
                          ) : null}
                        </div>
                      ))}
                    </section>
                  );
                })}
                {activeRound.resting.length ? (
                  <section className={styles.restingCard}>
                    <strong>Istirahat</strong>
                    <span>
                      {activeRound.resting.map((playerId) => nameOf(names, playerId)).join(", ")}
                    </span>
                  </section>
                ) : null}
                {!activeRound.matches.length ? (
                  <p className={styles.emptyState}>Belum ada pertandingan pada ronde ini.</p>
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </FocusShell>
  );
}
