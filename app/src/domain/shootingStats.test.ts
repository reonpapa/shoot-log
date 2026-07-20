import { describe, expect, it } from "vitest";
import { calculateRoundStats, calculateRoundWindowComparison, calculateSessionHalfComparison, calculateSessionStats } from "./shootingStats";
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

  it("直近5ラウンドをその前5ラウンドと比較する", () => {
    const previous = Array.from({ length: 5 }, (_, index) => createRound({
      roundNo: index + 1,
      finalResults: Array.from({ length: 25 }, () => "hit-on-first"),
    }));
    const recentResults = Array.from({ length: 25 }, (_, index) => index % 5 === 4 ? "miss" as const : "hit-on-first" as const);
    const recent = Array.from({ length: 5 }, (_, index) => createRound({
      roundNo: index + 6,
      finalResults: recentResults,
    }));

    const comparison = calculateRoundWindowComparison([...previous, ...recent]);

    expect(comparison).not.toBeNull();
    expect(comparison?.previous.averageScore).toBe(25);
    expect(comparison?.recent.averageScore).toBe(20);
    expect(comparison?.averageScoreDelta).toBe(-5);
    expect(comparison?.firstShotHitRateDelta).toBe(-20);
    expect(comparison?.weakestStand).toEqual({
      standNo: 5,
      hitRate: 0,
      previousHitRate: 100,
      delta: -100,
    });
  });

  it("比較に必要な10ラウンド未満では結果を作らない", () => {
    const rounds = Array.from({ length: 9 }, (_, index) => createRound({ roundNo: index + 1 }));

    expect(calculateRoundWindowComparison(rounds)).toBeNull();
  });

  it("セッションの前半と後半を比較して後半の低下を判定する", () => {
    const first = [1, 2].map((roundNo) => createRound({ roundNo, finalResults: Array.from({ length: 25 }, () => "hit-on-first") }));
    const laterResults = Array.from({ length: 25 }, (_, index) => index < 5 ? "miss" as const : "hit-on-first" as const);
    const second = [3, 4].map((roundNo) => createRound({ roundNo, finalResults: laterResults }));

    const comparison = calculateSessionHalfComparison([...first, ...second]);

    expect(comparison?.first.averageScore).toBe(25);
    expect(comparison?.second.averageScore).toBe(20);
    expect(comparison?.hitRateDelta).toBe(-20);
    expect(comparison?.trend).toBe("declined");
  });

  it("1ラウンドだけなら前後半比較を行わない", () => {
    expect(calculateSessionHalfComparison([createRound()])).toBeNull();
  });
});
