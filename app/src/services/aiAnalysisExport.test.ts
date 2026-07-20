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
    expect(prompt).not.toContain("秘密の射撃場");
    expect(prompt).not.toContain("secret-firearm");
    expect(prompt).not.toContain("個人的なメモ");
    expect(prompt).not.toContain("自由記述の気づき");
    expect(prompt).not.toContain(session.session.date);
  });
});
