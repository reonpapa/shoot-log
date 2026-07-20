import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createStoredSession } from "../test/fixtures";
import { AiAnalysisExport } from "./AiAnalysisExport";

describe("AI分析用データの共有", () => {
  it("共有機能の有無にかかわらずコピーしてChatGPTを開く通常ボタンを表示する", () => {
    const markup = renderToStaticMarkup(<AiAnalysisExport session={createStoredSession()} initiallyOpen />);

    expect(markup).toContain('class="primary-button"');
    expect(markup).toContain("コピーしてChatGPTを開く");
    expect(markup).toContain("分析用データをコピー");
    expect(markup).not.toContain("AIアプリへ共有");
  });
});
