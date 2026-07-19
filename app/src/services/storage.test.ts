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

    expect(normalizeStoredSession(session)?.session.practiceTheme).toBe("クレーを見てから銃を動かす");
  });
});
