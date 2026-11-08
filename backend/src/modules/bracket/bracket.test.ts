import { describe, expect, it } from "vitest";
import { roundCount } from "./algorithm";

describe("jumlah ronde", () => {
  it("durasi total dibagi (match + jeda), dibulatkan ke bawah", () => {
    expect(roundCount(90, 20, 5)).toBe(3);
    expect(roundCount(100, 20, 5)).toBe(4);
  });
});

// Kasus dari tabel "Contoh per cabang dan mode" di docs/proposal.md.
// Ubah it.todo menjadi it(...) saat generateBracket selesai.
describe("generateBracket", () => {
  it.todo("badminton ganda, 3 lapangan, 16 pemain: 12 main + 4 istirahat per ronde, tiap pemain main 3x dalam 4 ronde");
  it.todo("badminton tunggal, 2 lapangan, 6 pemain: 4 main + 2 istirahat, tiap pemain main 2x dalam 3 ronde");
  it.todo("tennis tunggal, 3 lapangan, 8 pemain: 6 main + 2 istirahat, 4 ronde, tiap pemain main 3x");
  it.todo("tennis ganda, 1 lapangan, 6 pemain: 4 main + 2 istirahat, 3 ronde, tiap pemain main 2x");
  it.todo("padel ganda, 2 lapangan, 10 pemain: 8 main + 2 istirahat, 5 ronde, tiap pemain main 4x");
  it.todo("padel tunggal, 1 lapangan, 4 pemain: 2 main + 2 istirahat, 2 ronde, tiap pemain main 1x");
  it.todo("basket full court, 15 pemain (3 tim x 5): T1-T2, T1-T3, T2-T3, tiap tim istirahat sekali");
  it.todo("basket tepat 10 pemain: satu lapangan 5 lawan 5, tim diacak ulang tiap ronde");
  it.todo("futsal 25 pemain (5 tim x 5), 2 lapangan: 20 main + 5 istirahat per ronde, tiap pemain main 4x");
  it.todo("selisih jumlah main antar pemain paling banyak 1 untuk kombinasi acak");
  it.todo("pasangan yang sama tidak berulang selama masih ada kombinasi baru");
});
