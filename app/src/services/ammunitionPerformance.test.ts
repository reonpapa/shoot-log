import { describe, expect, it } from "vitest";
import { createRound, createStoredSession } from "../test/fixtures";
import { getAmmunitionPerformance } from "./ammunitionPerformance";

describe("実包別パフォーマンス", () => {
  it("実包ごとの使用回数・平均スコア・命中率を集計する", () => {
    const first = createStoredSession({ id: "first", ammunitionName: "Ammo A", rounds: [createRound({ finalResults: Array.from({ length: 25 }, () => "hit-on-first") })] });
    const secondResults = Array.from({ length: 25 }, (_, index) => index < 5 ? "miss" as const : "hit-on-first" as const);
    const second = createStoredSession({ id: "second", ammunitionName: "Ammo A", rounds: [createRound({ finalResults: secondResults })] });
    const other = createStoredSession({ id: "other", ammunitionName: "Ammo B", rounds: [createRound()] });

    const result = getAmmunitionPerformance([first, second, other]);

    expect(result[0]).toMatchObject({ ammunitionName: "Ammo A", sessionCount: 2, roundCount: 2, averageScore: 22.5, hitRate: 90, firstShotHitRate: 90 });
    expect(result[1]).toMatchObject({ ammunitionName: "Ammo B", sessionCount: 1, roundCount: 1 });
  });

  it("未完了セッションを除外する", () => {
    const draft = createStoredSession({ status: "draft", ammunitionName: "Ammo A" });
    expect(getAmmunitionPerformance([draft])).toEqual([]);
  });
});
