import { describe, expect, it } from "vitest";
import { createEmptyRound } from "../domain/shooting";
import { facesForRange, getTrapSettingPerformance, rangesEquivalent, trapSetOptions } from "./trapSettings";
import { DEFAULT_TRAP_SETS, splitLegacyTrapSettings } from "./masterData";
import { normalizeStoredSession } from "./storage";

describe("trap settings", () => {
  it("伊勢原の3射面を候補にする", () => {
    expect(facesForRange("神奈川県立伊勢原射撃場")).toHaveLength(3);
    expect(facesForRange("大井射撃場")).toHaveLength(2);
    expect(facesForRange("大井射撃場")[0]).toEqual(expect.objectContaining({ rangeName: "神奈川大井射撃場", face: "国際射面" }));
  });

  it("セットは射撃場に関係なく共通の候補を返す", () => {
    expect(trapSetOptions()).toBe(DEFAULT_TRAP_SETS);
    expect(trapSetOptions([]).map((item) => item.name)).toContain("ISSF国際セット");
    const custom = [{ id: "own", name: "自分のセット", distanceMeters: 70 }];
    expect(trapSetOptions(custom)).toBe(custom);
  });

  it("射面とセットが固定されていた旧データを分割する", () => {
    const legacy = [
      { id: "t1", rangeName: "伊勢原", face: "第1面", setType: "ISSF国際セット", distanceMeters: 76, speedKmh: 98 },
      { id: "t2", rangeName: "伊勢原", face: "第2面", setType: "練習セット", distanceMeters: 55, speedKmh: 78 },
      { id: "t3", rangeName: "伊勢原", face: "第3面", setType: "ISSF国際セット", distanceMeters: 76, speedKmh: 98 },
    ];

    const { rangeFaces, trapSets } = splitLegacyTrapSettings(legacy);

    expect(rangeFaces.map((item) => item.face)).toEqual(["第1面", "第2面", "第3面"]);
    expect(trapSets.map((item) => item.name)).toEqual(["ISSF国際セット", "練習セット"]);
    expect(trapSets[0]).toEqual(expect.objectContaining({ distanceMeters: 76, speedKmh: 98 }));
  });

  it("設定不明を推測せず集計から除外する", () => {
    const unknown = createEmptyRound(1);
    const known = { ...createEmptyRound(2), trapSetting: { rangeName: "神奈川県立伊勢原射撃場", face: "第1面", setType: "ISSF国際セット", distanceMeters: 76, speedKmh: 98 } };
    expect(getTrapSettingPerformance([unknown, known])).toEqual([expect.objectContaining({ label: "神奈川県立伊勢原射撃場・第1面・ISSF国際セット", rounds: 1 })]);
  });

  it("過去の射面設定へセッションの射撃場名を補完する", () => {
    const round = { ...createEmptyRound(1), trapSetting: { rangeName: "", face: "第2面", setType: "練習セット", distanceMeters: 55 } };
    const normalized = normalizeStoredSession({ id: "session-1", session: { date: "2026-08-01", rangeName: "神奈川県立伊勢原射撃場", discipline: "trap", ammunitionName: "Test" }, rounds: [round], review: {}, status: "completed", createdAt: "2026-08-01T00:00:00Z", updatedAt: "2026-08-01T00:00:00Z" });
    expect(normalized?.rounds[0].trapSetting?.rangeName).toBe("神奈川県立伊勢原射撃場");
  });

  it("旧名称と正式名称を同じ射撃場として扱う", () => {
    expect(rangesEquivalent("大井射撃場", "神奈川大井射撃場")).toBe(true);
    expect(rangesEquivalent("伊勢原射撃場", "神奈川県立伊勢原射撃場")).toBe(true);
  });
});
