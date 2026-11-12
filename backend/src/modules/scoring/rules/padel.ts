import { gamesAndSetsRules } from "./games-and-sets";

/**
 * Padel memakai struktur game dan set seperti tennis. Golden point (`noAd`) bisa dinyalakan Coach.
 * Padel tunggal memakai lapangan dan aturan skor yang sama dengan ganda (asumsi sementara, pertanyaan #2).
 * Kejadian AI belum ditentukan (TODO(decision), pertanyaan terbuka #11).
 */
export const padelRules = gamesAndSetsRules("padel", {
  gamesPerSet: 6,
  setsToWin: 2,
  tiebreakAt: 6,
  tiebreakPoints: 7,
  noAd: false,
});
