import { describe, expect, it } from "vitest";
import { createEmptyRound } from "./shooting";
import { getNextShotIndex } from "./shootingInput";

describe("スコア入力後の移動", () => {
  it("次のクレーへ進む", () => {
    expect(getNextShotIndex(0, 25)).toBe(1);
    expect(getNextShotIndex(12, 25)).toBe(13);
  });

  it("最後のクレーでは25枚目に留まる", () => {
    expect(getNextShotIndex(24, 25)).toBe(24);
  });
});

describe("新規ラウンドの初期設定", () => {
  it("2発撃ちを選択する", () => {
    expect(createEmptyRound(1).fireMode).toBe("double");
  });
});
