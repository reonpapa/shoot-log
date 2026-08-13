import { describe, expect, it } from "vitest";
import { createEmptySkeetRound } from "./shooting";

describe("スキート試作版の25枚構成", () => {
  it("8射台・25枚で、各クレーのハウスとダブル順を保持する", () => {
    const round = createEmptySkeetRound(1);
    expect(round.shots).toHaveLength(25);
    expect(new Set(round.shots.map((shot) => shot.standNo))).toEqual(new Set([1, 2, 3, 4, 5, 6, 7, 8]));
    expect(round.shots.every((shot) => shot.skeetHouse === "high" || shot.skeetHouse === "low")).toBe(true);
    expect(round.shots.filter((shot) => shot.skeetPairId)).toHaveLength(16);
    expect(round.fireMode).toBe("single");
  });

  it("射台4へ戻る正順・逆順ダブルと最後の射台8を含む", () => {
    const shots = createEmptySkeetRound(1).shots;
    expect(shots.slice(19, 23).map((shot) => [shot.standNo, shot.skeetHouse, shot.skeetPairOrder])).toEqual([
      [4, "high", 1], [4, "low", 2], [4, "low", 1], [4, "high", 2],
    ]);
    expect(shots.slice(23).map((shot) => [shot.standNo, shot.skeetHouse])).toEqual([[8, "high"], [8, "low"]]);
  });
});
