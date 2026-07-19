import { describe, expect, it } from "vitest";
import { createStoredSession } from "../test/fixtures";
import { getSuggestedPracticeTheme } from "./sessionPlanning";

describe("次回の練習テーマ", () => {
  it("明示した次回課題を最優先する", () => {
    const session = createStoredSession();
    session.session.practiceTheme = "今回のテーマ";
    session.review = { ...session.review, nextChallenge: "次のテーマ", themeAchievement: "partial" };

    expect(getSuggestedPracticeTheme([session])).toBe("次のテーマ");
  });

  it("一部達成で次回課題が空なら今回のテーマを継続する", () => {
    const session = createStoredSession();
    session.session.practiceTheme = "クレーを見てから銃を動かす";
    session.review = { ...session.review, themeAchievement: "partial" };

    expect(getSuggestedPracticeTheme([session])).toBe("クレーを見てから銃を動かす");
  });

  it("達成済みで次回課題が空ならテーマを継続しない", () => {
    const session = createStoredSession();
    session.session.practiceTheme = "今回のテーマ";
    session.review = { ...session.review, themeAchievement: "achieved" };

    expect(getSuggestedPracticeTheme([session])).toBe("");
  });
});
