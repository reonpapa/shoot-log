import { describe, expect, it } from "vitest";
import { createEmptyRound } from "./shooting";
import { applyShotInput, getNextShotIndex, getShotInput } from "./shootingInput";

describe("スコア入力後の移動", () => {
  it("次のクレーへ進む", () => {
    expect(getNextShotIndex(0, 25)).toBe(1);
    expect(getNextShotIndex(12, 25)).toBe(13);
  });

  it("最後のクレーでは25枚目に留まる", () => {
    expect(getNextShotIndex(24, 25)).toBe(24);
  });
});

describe("初矢命中後の二発目発射", () => {
  it("初矢命中の得点を保ちながら独立した発射記録を残す", () => {
    const shot = applyShotInput(createEmptyRound(1).shots[0], "hit-on-first-second-fired");

    expect(shot.finalResult).toBe("hit-on-first");
    expect(shot.secondShotResult).toBe("not-fired");
    expect(shot.secondShotFiredAfterFirstHit).toBe(true);
    expect(getShotInput(shot)).toBe("hit-on-first-second-fired");
  });

  it("別の結果へ変更すると発射記録を解除する", () => {
    const recorded = applyShotInput(createEmptyRound(1).shots[0], "hit-on-first-second-fired");
    const changed = applyShotInput(recorded, "hit-on-first");

    expect(changed.secondShotFiredAfterFirstHit).toBeUndefined();
    expect(getShotInput(changed)).toBe("hit-on-first");
  });
});

describe("新規ラウンドの初期設定", () => {
  it("2発撃ちを選択する", () => {
    expect(createEmptyRound(1).fireMode).toBe("double");
  });
});
