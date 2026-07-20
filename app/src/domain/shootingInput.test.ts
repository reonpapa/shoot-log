import { describe, expect, it } from "vitest";
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
