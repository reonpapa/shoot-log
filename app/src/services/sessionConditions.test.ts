import { describe, expect, it } from "vitest";
import { formatShootingConditions } from "./sessionConditions";

describe("射撃コンディション表示", () => {
  it("入力された項目だけを読みやすく表示する", () => {
    expect(formatShootingConditions({ weather: "晴れ", temperature: "18", windDirection: "向かい風", windStrength: "普通" })).toBe("晴れ・18℃・向かい風・普通");
    expect(formatShootingConditions({ weather: "", temperature: "", windDirection: "右から", windStrength: "弱い" })).toBe("右から・弱い");
  });
});
