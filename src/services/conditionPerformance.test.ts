import { describe, expect, it } from "vitest";
import { createRound, createStoredSession } from "../test/fixtures";
import { getConditionPerformance } from "./conditionPerformance";

describe("コンディション別成績", () => {
  it("天候・風向・風の強さごとに平均を集計する", () => {
    const first = createStoredSession({ id: "first", rounds: [createRound({ finalResults: ["hit-on-first", "miss"] })] });
    first.session.weather = "晴れ";
    first.session.windDirection = "向かい風";
    first.session.windStrength = "弱い";
    const second = createStoredSession({ id: "second", rounds: [createRound({ finalResults: ["hit-on-first", "hit-on-first"] })] });
    second.session.weather = "晴れ";
    second.session.windDirection = "追い風";
    second.session.windStrength = "弱い";

    const result = getConditionPerformance([first, second]);
    expect(result.weather[0]).toMatchObject({ condition: "晴れ", sessionCount: 2, roundCount: 2, averageScore: 1.5, hitRate: 75 });
    expect(result.windDirection).toHaveLength(2);
    expect(result.windStrength[0]).toMatchObject({ condition: "弱い", sessionCount: 2, averageScore: 1.5 });
  });

  it("未完了と条件未入力の記録は除外する", () => {
    const draft = createStoredSession({ status: "draft" });
    draft.session.windDirection = "向かい風";
    const blank = createStoredSession({ id: "blank" });
    blank.session.weather = "";

    expect(getConditionPerformance([draft, blank])).toEqual({ weather: [], windDirection: [], windStrength: [] });
  });
});
