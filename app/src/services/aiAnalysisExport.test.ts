import { describe, expect, it } from "vitest";
import { createRound, createStoredSession } from "../test/fixtures";
import { createAiAnalysisPrompt } from "./aiAnalysisExport";

describe("AI分析用データ", () => {
  it("個人情報を除外し、本人の振り返りを分析用データへ含める", () => {
    const session = createStoredSession({ rounds: [createRound({ finalResults: ["hit-on-first", "miss"] })] });
    session.session.rangeName = "秘密の射撃場";
    session.session.firearmId = "secret-firearm";
    session.session.memo = "個人的なメモ";
    session.review.findings = "自由記述の気づき";
    session.review.problems = "右方向のクレーに不安がある";
    session.review.nextChallenge = "次回は焦らず動作を確認する";
    session.session.temperature = "18";

    const prompt = createAiAnalysisPrompt(session);
    expect(prompt).toContain("総合スコア：1/2");
    expect(prompt).toContain("コンディション：晴れ・18℃");
    expect(prompt).toContain("失中したクレーの飛翔方向");
    expect(prompt).toContain("弾が外れた方向や照準位置ではありません");
    expect(prompt).toContain("記録されていない原因は断定しないでください");
    expect(prompt).toContain("R1 1発撃ち 1/2");
    expect(prompt).toContain("1発撃ち：1R、1/2");
    expect(prompt).toContain("1発撃ちと2発撃ちを同じ条件として単純比較しないでください");
    expect(prompt).toContain("本人の振り返り：");
    expect(prompt).toContain("今日の気づき：自由記述の気づき");
    expect(prompt).toContain("うまくいかなかったこと：右方向のクレーに不安がある");
    expect(prompt).toContain("次回試すこと：次回は焦らず動作を確認する");
    expect(prompt).toContain("不安や悩みに配慮して回答してください");
    expect(prompt).not.toContain("秘密の射撃場");
    expect(prompt).not.toContain("secret-firearm");
    expect(prompt).not.toContain("個人的なメモ");
    expect(prompt).not.toContain(session.session.date);
  });

  it("2発撃ちの二の矢命中を発射方式別に出力する", () => {
    const session = createStoredSession({ rounds: [createRound({ fireMode: "double", finalResults: ["hit-on-first", "hit-on-second", "miss"] })] });

    const prompt = createAiAnalysisPrompt(session);
    expect(prompt).toContain("R1 2発撃ち 2/3");
    expect(prompt).toContain("2発撃ち：1R、2/3（命中率 66.7%、初矢 1、二の矢 1、初矢命中後の二発目 0）");
  });

  it("初矢命中後の二発目発射を命中・失中と分けて出力する", () => {
    const round = createRound({ fireMode: "double", finalResults: ["hit-on-first"] });
    round.shots[0].secondShotFiredAfterFirstHit = true;
    const prompt = createAiAnalysisPrompt(createStoredSession({ rounds: [round] }));

    expect(prompt).toContain("初矢命中後の二発目発射：1");
    expect(prompt).toContain("二の矢命中や失中には数えないでください");
  });

  it("英語表示ではAIへの質問文と集計を英語で出力する", () => {
    const session = createStoredSession({ rounds: [createRound({ finalResults: ["hit-on-first", "miss"] })] });
    session.review.findings = "Stayed calm";
    const prompt = createAiAnalysisPrompt(session, "en");

    expect(prompt).toContain("Analyze the following clay shooting record.");
    expect(prompt).toContain("Overall score: 1/2");
    expect(prompt).toContain("Shooter review:");
    expect(prompt).toContain("What I noticed: Stayed calm");
    expect(prompt).not.toContain("以下のクレー射撃記録");
  });
});
