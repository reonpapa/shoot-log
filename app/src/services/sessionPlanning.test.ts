import { describe, expect, it } from "vitest";
import { createStoredSession } from "../test/fixtures";
import { filterSessionsByPracticeTheme, getPracticeThemeProgress, getSuggestedPracticeTheme } from "./sessionPlanning";

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

describe("練習テーマによる履歴の絞り込み", () => {
  it("練習テーマが一致する履歴を返す", () => {
    const matching = createStoredSession({ id: "matching" });
    matching.session.practiceTheme = "クレーを見てから銃を動かす";
    const unrelated = createStoredSession({ id: "unrelated" });
    unrelated.session.practiceTheme = "頬付けを安定させる";

    expect(filterSessionsByPracticeTheme([matching, unrelated], "クレーを見てから銃を動かす")).toEqual([matching]);
  });

  it("次回試すことが一致する履歴も返す", () => {
    const source = createStoredSession({ id: "source" });
    source.review.nextChallenge = "初矢の照準を確認する";

    expect(filterSessionsByPracticeTheme([source], "初矢の照準を確認する")).toEqual([source]);
  });

  it("改行と連続した空白を同一テーマとして扱う", () => {
    const session = createStoredSession();
    session.session.practiceTheme = "クロスドミナンス対策\n両目で照準する";

    expect(filterSessionsByPracticeTheme([session], "クロスドミナンス対策  両目で照準する")).toEqual([session]);
  });
});

describe("練習テーマの進捗", () => {
  it("実施回数・連続回数・達成度を集計する", () => {
    const first = createStoredSession({ id: "first", date: "2026-07-17" });
    first.session.practiceTheme = "クレーを見てから銃を動かす";
    first.review.themeAchievement = "partial";
    const other = createStoredSession({ id: "other", date: "2026-07-18" });
    other.session.practiceTheme = "頬付けを安定させる";
    const latest = createStoredSession({ id: "latest", date: "2026-07-19" });
    latest.session.practiceTheme = "クレーを見てから銃を動かす";
    latest.review.themeAchievement = "achieved";

    const progress = getPracticeThemeProgress([first, other, latest], "クレーを見てから銃を動かす");

    expect(progress.sessions.map((item) => item.id)).toEqual(["first", "latest"]);
    expect(progress.sessionCount).toBe(2);
    expect(progress.consecutiveCount).toBe(1);
    expect(progress.achievedCount).toBe(1);
    expect(progress.partialCount).toBe(1);
    expect(progress.notAchievedCount).toBe(0);
  });

  it("次回課題に書かれただけのテーマは実施回数に含めない", () => {
    const source = createStoredSession();
    source.review.nextChallenge = "初矢の照準を確認する";

    expect(getPracticeThemeProgress([source], "初矢の照準を確認する").sessionCount).toBe(0);
  });

  it("未完了セッションは進捗に含めない", () => {
    const draft = createStoredSession({ status: "draft" });
    draft.session.practiceTheme = "初矢の照準を確認する";

    expect(getPracticeThemeProgress([draft], "初矢の照準を確認する").sessionCount).toBe(0);
  });
});
