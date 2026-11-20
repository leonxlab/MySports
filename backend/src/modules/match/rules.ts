/**
 * Aturan murni modul match: nilai bawaan, state machine, dan timer.
 * Timer dihitung dari server (waktu mulai/lanjut tersimpan), tidak dari klien.
 */
export type Sport = "basketball" | "badminton" | "tennis" | "padel" | "futsal";
export type MatchStatus = "scheduled" | "running" | "paused" | "finished" | "cancelled";
export type PauseReason = "manual" | "timeout" | "hydration";

export interface BreakRule {
  /** Jumlah yang boleh dipakai selama match. */
  count: number;
  seconds: number;
}

export interface MatchSettings {
  mode: "singles" | "doubles" | "team";
  /** Durasi match atau ronde, menit. */
  durationMinutes: number;
  playersPerSide: number;
  timeout: BreakRule;
  hydration: BreakRule;
  /** Jeda antar ronde, menit (dipakai bracket untuk menghitung jumlah ronde). */
  breakMinutes: number;
  /** Penimpa aturan skor (dikelola modul scoring). */
  rules?: Record<string, unknown>;
}

/**
 * TODO(decision): angka bawaan di bawah adalah placeholder. Proposal hanya menyebut parameter
 * apa yang ada, bukan nilainya. Ganti di sini saja; tidak ada nilai bawaan lain di kode.
 */
export const DEFAULT_SETTINGS: Record<Sport, MatchSettings> = {
  basketball: { mode: "team", durationMinutes: 40, playersPerSide: 5, timeout: { count: 2, seconds: 60 }, hydration: { count: 1, seconds: 120 }, breakMinutes: 5 },
  futsal: { mode: "team", durationMinutes: 40, playersPerSide: 5, timeout: { count: 1, seconds: 60 }, hydration: { count: 1, seconds: 120 }, breakMinutes: 5 },
  badminton: { mode: "doubles", durationMinutes: 20, playersPerSide: 2, timeout: { count: 0, seconds: 0 }, hydration: { count: 1, seconds: 60 }, breakMinutes: 5 },
  tennis: { mode: "singles", durationMinutes: 30, playersPerSide: 1, timeout: { count: 0, seconds: 0 }, hydration: { count: 1, seconds: 90 }, breakMinutes: 5 },
  padel: { mode: "doubles", durationMinutes: 30, playersPerSide: 2, timeout: { count: 0, seconds: 0 }, hydration: { count: 1, seconds: 90 }, breakMinutes: 5 },
};

export interface Runtime {
  /** Waktu terakhir match mulai atau dilanjutkan (ISO), null bila tidak sedang berjalan. */
  resumedAt: string | null;
  timeoutsUsed: number;
  hydrationUsed: number;
  pauseReason: PauseReason | null;
}

export const initialRuntime = (): Runtime => ({
  resumedAt: null,
  timeoutsUsed: 0,
  hydrationUsed: 0,
  pauseReason: null,
});

export type MatchAction = "start" | "pause" | "resume" | "finish" | "timeout" | "hydration" | "cancel";

export interface MatchState {
  status: MatchStatus;
  elapsedSeconds: number;
  startedAt: string | null;
  finishedAt: string | null;
  runtime: Runtime;
}

export class MatchRuleError extends Error {
  constructor(
    public code: "INVALID_TRANSITION" | "NO_TIMEOUT_LEFT" | "NO_HYDRATION_LEFT",
    message: string,
  ) {
    super(message);
  }
}

/** Detik yang sudah berlalu sampai `now`, termasuk bagian yang sedang berjalan. */
export function elapsedAt(state: MatchState, now: Date): number {
  if (state.status !== "running" || !state.runtime.resumedAt) return state.elapsedSeconds;
  const extra = Math.max(0, Math.floor((now.getTime() - new Date(state.runtime.resumedAt).getTime()) / 1000));
  return state.elapsedSeconds + extra;
}

const allowed: Record<MatchAction, MatchStatus[]> = {
  start: ["scheduled"],
  pause: ["running"],
  resume: ["paused"],
  finish: ["running", "paused"],
  timeout: ["running"],
  hydration: ["running"],
  cancel: ["scheduled", "running", "paused"],
};

/** Terapkan satu aksi. Mengembalikan state baru, tidak mengubah yang lama. */
export function applyAction(state: MatchState, action: MatchAction, settings: MatchSettings, now: Date): MatchState {
  if (!allowed[action].includes(state.status)) {
    throw new MatchRuleError("INVALID_TRANSITION", `Aksi ${action} tidak bisa dilakukan saat match ${state.status}`);
  }
  const iso = now.toISOString();
  const elapsed = elapsedAt(state, now);
  const runtime = { ...state.runtime };
  const stop = (status: MatchStatus, reason: PauseReason | null): MatchState => ({
    ...state,
    status,
    elapsedSeconds: elapsed,
    runtime: { ...runtime, resumedAt: null, pauseReason: reason },
  });

  switch (action) {
    case "start":
      return { ...state, status: "running", startedAt: iso, runtime: { ...runtime, resumedAt: iso, pauseReason: null } };
    case "resume":
      return { ...state, status: "running", runtime: { ...runtime, resumedAt: iso, pauseReason: null } };
    case "pause":
      return stop("paused", "manual");
    case "timeout":
      if (runtime.timeoutsUsed >= settings.timeout.count) {
        throw new MatchRuleError("NO_TIMEOUT_LEFT", "Jatah time out sudah habis");
      }
      runtime.timeoutsUsed += 1;
      return stop("paused", "timeout");
    case "hydration":
      if (runtime.hydrationUsed >= settings.hydration.count) {
        throw new MatchRuleError("NO_HYDRATION_LEFT", "Jatah hydration break sudah habis");
      }
      runtime.hydrationUsed += 1;
      return stop("paused", "hydration");
    case "finish":
      return { ...stop("finished", null), finishedAt: iso };
    case "cancel":
      return { ...stop("cancelled", null), finishedAt: iso };
  }
}

export type SettingsPatch = Omit<Partial<MatchSettings>, "timeout" | "hydration"> & {
  timeout?: Partial<BreakRule>;
  hydration?: Partial<BreakRule>;
};

/** Tempelkan penimpa sebagian ke setting yang sudah ada (blok time out dan hydration digabung per field). */
export function patchSettings(base: MatchSettings, overrides: SettingsPatch = {}): MatchSettings {
  return {
    ...base,
    ...overrides,
    timeout: { ...base.timeout, ...overrides.timeout },
    hydration: { ...base.hydration, ...overrides.hydration },
  };
}

/** Gabungkan penimpa Coach ke nilai bawaan cabang. */
export function mergeSettings(sport: Sport, overrides: SettingsPatch = {}): MatchSettings {
  return patchSettings(DEFAULT_SETTINGS[sport], overrides);
}
