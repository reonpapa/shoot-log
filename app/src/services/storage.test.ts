import { describe, expect, it } from "vitest";
import { createRound, createStoredSession } from "../test/fixtures";
import { normalizeStoredSession } from "./storage";

describe("射撃履歴の互換性", () => {
  const completeRound = () => createRound({ finalResults: Array.from({ length: 25 }, () => "hit-on-first") });

  it("過去データに練習テーマがなくても読み込める", () => {
    const legacy = createStoredSession({ rounds: [completeRound()] });
    delete legacy.session.practiceTheme;

    expect(normalizeStoredSession(legacy)?.session.practiceTheme).toBe("");
  });

  it("保存された練習テーマを保持する", () => {
    const session = createStoredSession({ rounds: [completeRound()] });
    session.session.practiceTheme = "クレーを見てから銃を動かす";
    session.review.themeAchievement = "partial";

    expect(normalizeStoredSession(session)?.session.practiceTheme).toBe("クレーを見てから銃を動かす");
    expect(normalizeStoredSession(session)?.review.themeAchievement).toBe("partial");
  });

  it("過去データに射撃コンディションがなくても読み込める", () => {
    const legacy = createStoredSession({ rounds: [completeRound()] });
    delete legacy.session.temperature;
    delete legacy.session.windDirection;
    delete legacy.session.windStrength;

    const normalized = normalizeStoredSession(legacy);
    expect(normalized?.session.temperature).toBe("");
    expect(normalized?.session.windDirection).toBe("");
    expect(normalized?.session.windStrength).toBe("");
  });

  it("保存された射撃コンディションを保持する", () => {
    const session = createStoredSession({ rounds: [completeRound()] });
    session.session.temperature = "18";
    session.session.windDirection = "向かい風";
    session.session.windStrength = "普通";

    const normalized = normalizeStoredSession(session);
    expect(normalized?.session.temperature).toBe("18");
    expect(normalized?.session.windDirection).toBe("向かい風");
    expect(normalized?.session.windStrength).toBe("普通");
  });
});
