import { describe, expect, it } from "vitest";
import { calculateRoundStats, calculateSessionStats } from "./shootingStats";
import { createRound } from "../test/fixtures";

describe("射撃集計", () => {
  it("1発撃ちでは二の矢を実包消費へ含めない", () => {
    const round = createRound({
      fireMode: "single",
      finalResults: ["hit-on-first", "miss", "skip"],
    });

    const stats = calculateRoundStats(round);

    expect(stats.score).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.expectedCartridgesUsed).toBe(2);
  });

  it("2発撃ちでは二の矢まで実包消費へ反映する", () => {
    const round = createRound({
      fireMode: "double",
      finalResults: ["hit-on-first", "hit-on-second", "miss"],
    });

    const stats = calculateRoundStats(round);

    expect(stats.score).toBe(2);
    expect(stats.firstShotHits).toBe(1);
    expect(stats.secondShotHits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.expectedCartridgesUsed).toBe(5);
  });

  it("実包使用数の実数補正をセッション合計へ採用する", () => {
    const session = {
      id: "session-1",
      date: "2026-07-19",
      rangeName: "大井射撃場",
      ammunitionName: "Fiocchi TT TWO",
      rounds: [
        createRound({ roundNo: 1, finalResults: ["hit-on-first", "miss"], actualCartridgesUsed: 3 }),
        createRound({ roundNo: 2, finalResults: ["hit-on-first"], actualCartridgesUsed: 2 }),
      ],
    };

    const stats = calculateSessionStats(session);

    expect(stats.expectedCartridgesUsed).toBe(3);
    expect(stats.cartridgesUsed).toBe(5);
  });
});
