import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createStoredSession } from "../test/fixtures";
import { SessionList } from "./SessionList";

describe("過去の練習テーマ", () => {
  it("実際に取り組んだセッションのスコア推移を表示する", () => {
    const sessions = ["2026-07-18", "2026-07-25", "2026-08-01"].map((date, index) => {
      const session = createStoredSession({ id: `theme-${index}`, date });
      session.session.practiceTheme = "頬付けを安定させる";
      session.review.themeAchievement = index === 2 ? "achieved" : "partial";
      return session;
    });
    const markup = renderToStaticMarkup(<SessionList sessions={sessions} firearms={[]} suggestedPracticeTheme="" onCreate={() => undefined} onManage={() => undefined} onData={() => undefined} onAccount={() => undefined} onAmmunition={() => undefined} onOpen={() => undefined} onDelete={() => undefined} />);

    expect(markup).toContain("過去の練習テーマ");
    expect(markup).toContain("スコア推移");
    expect(markup).toContain("できた 1");
    expect(markup).toContain("一部できた 2");
    expect(markup).toContain("できなかった 0");
    expect(markup).toContain("07-18");
    expect(markup).toContain("08-01");
    expect(markup).toContain("アカウント設定");
    expect(markup).not.toContain(">アカウント</button>");
  });
});
