import { describe, expect, it } from "vitest";
import { createRound, createStoredSession } from "../test/fixtures";
import { filterSessionsByPracticeTheme, getPracticeRecommendation, getPracticeThemeHistory, getPracticeThemeProgress, getSuggestedPracticeTheme } from "./sessionPlanning";

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

  it("直近データから命中率が低い射台を理由付きで提案する", () => {
    const results = Array.from({ length: 25 }, (_, index) => index % 5 === 2 ? "miss" as const : "hit-on-first" as const);
    const sessions = ["2026-07-15", "2026-07-16", "2026-07-17"].map((date, index) =>
      createStoredSession({ id: `weak-${index}`, date, rounds: [createRound({ finalResults: results })] })
    );

    expect(getPracticeRecommendation(sessions)).toMatchObject({
      theme: "Stand 3でクレーをよく見て、丁寧に撃つ",
      source: "weakest-stand",
    });
    expect(getPracticeRecommendation(sessions)?.reason).toContain("全体より");
  });

  it("50枚未満では分析による提案を出さない", () => {
    const session = createStoredSession({ rounds: [createRound({ finalResults: Array.from({ length: 25 }, () => "miss" as const) })] });

    expect(getPracticeRecommendation([session])).toBeNull();
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

describe("練習テーマ履歴", () => {
  it("表記揺れをまとめて新しいテーマ順に集計する", () => {
    const older = createStoredSession({ id: "older", date: "2026-07-10" });
    older.session.practiceTheme = "クレーを見てから\n銃を動かす";
    older.review.themeAchievement = "partial";
    const newer = createStoredSession({ id: "newer", date: "2026-07-19" });
    newer.session.practiceTheme = "クレーを見てから  銃を動かす";
    newer.review.themeAchievement = "achieved";
    const latestOther = createStoredSession({ id: "latest-other", date: "2026-07-20" });
    latestOther.session.practiceTheme = "頬付けを安定させる";

    const history = getPracticeThemeHistory([older, newer, latestOther]);

    expect(history.map((item) => item.theme)).toEqual(["頬付けを安定させる", "クレーを見てから  銃を動かす"]);
    expect(history[1]).toMatchObject({ sessionCount: 2, ratedCount: 2, achievedCount: 1, achievementRate: 50 });
  });

  it("テーマ別の平均ラウンドスコアを計算する", () => {
    const tenHits = createRound({ finalResults: [
      ...Array.from({ length: 10 }, () => "hit-on-first" as const),
      ...Array.from({ length: 15 }, () => "miss" as const),
    ] });
    const twentyHits = createRound({ roundNo: 2, finalResults: [
      ...Array.from({ length: 20 }, () => "hit-on-first" as const),
      ...Array.from({ length: 5 }, () => "miss" as const),
    ] });
    const session = createStoredSession({ rounds: [tenHits, twentyHits] });
    session.session.practiceTheme = "初矢を丁寧に撃つ";

    expect(getPracticeThemeHistory([session])[0].averageScore).toBe(15);
  });

  it("達成度が未入力なら達成率を未評価にする", () => {
    const session = createStoredSession();
    session.session.practiceTheme = "初矢を丁寧に撃つ";

    expect(getPracticeThemeHistory([session])[0]).toMatchObject({ ratedCount: 0, achievementRate: null });
  });

  it("未完了セッションとテーマ未設定セッションを除外する", () => {
    const draft = createStoredSession({ id: "draft", status: "draft" });
    draft.session.practiceTheme = "初矢を丁寧に撃つ";
    const blank = createStoredSession({ id: "blank" });

    expect(getPracticeThemeHistory([draft, blank])).toEqual([]);
  });
});
