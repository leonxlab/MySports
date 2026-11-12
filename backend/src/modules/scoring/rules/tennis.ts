import { gamesAndSetsRules } from "./games-and-sets";

/**
 * Tennis tunggal dan ganda: poin 0/15/30/40, deuce, game, set, tiebreak di 6-6.
 * Kejadian AI belum ditentukan (TODO(decision), pertanyaan terbuka #11; usulan: bola mendarat di dalam
 * atau di luar garis). Sampai itu diputuskan, poin datang dari input Coach atau `ball_landed`.
 */
export const tennisRules = gamesAndSetsRules("tennis", {
  gamesPerSet: 6,
  setsToWin: 2,
  tiebreakAt: 6,
  tiebreakPoints: 7,
  noAd: false,
});
