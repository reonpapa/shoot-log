import { describe, expect, it } from "vitest";
import { createRound, createStoredSession } from "../test/fixtures";
import { createAiAnalysisPrompt } from "./aiAnalysisExport";

describe("AI分析用データ", () => {
  it("成績を含め、個人情報につながる項目と自由記述を除外する", () => {
    const session = createStoredSession({ rounds: [createRound({ finalResults: ["hit-on-first", "miss"] })] });
    session.session.rangeName = "秘密の射撃場";
    session.session.firearmId = "secret-firearm";
    session.session.memo = "個人的なメモ";
    session.review.findings = "自由記述の気づき";
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
    expect(prompt).not.toContain("秘密の射撃場");
    expect(prompt).not.toContain("secret-firearm");
    expect(prompt).not.toContain("個人的なメモ");
    expect(prompt).not.toContain("自由記述の気づき");
    expect(prompt).not.toContain(session.session.date);
  });

  it("2発撃ちの二の矢命中を発射方式別に出力する", () => {
    const session = createStoredSession({ rounds: [createRound({ fireMode: "double", finalResults: ["hit-on-first", "hit-on-second", "miss"] })] });

    const prompt = createAiAnalysisPrompt(session);
    expect(prompt).toContain("R1 2発撃ち 2/3");
    expect(prompt).toContain("2発撃ち：1R、2/3（命中率 66.7%、初矢 1、二の矢 1）");
  });
});
