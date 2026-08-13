import { describe, expect, it } from "vitest";
import { createEmptyRound } from "../domain/shooting";
import { getTrapSettingPerformance, trapPresetsForRange } from "./trapSettings";
import { normalizeStoredSession } from "./storage";

describe("trap settings", () => {
  it("伊勢原の3射面を候補にする", () => {
    expect(trapPresetsForRange("神奈川県立伊勢原射撃場")).toHaveLength(3);
    expect(trapPresetsForRange("大井射撃場")).toHaveLength(2);
    expect(trapPresetsForRange("大井射撃場")[0]).toEqual(expect.objectContaining({ rangeName: "神奈川大井射撃場", face: "国際射面", distanceMeters: 76 }));
    expect(trapPresetsForRange("大井射撃場")[0]).not.toHaveProperty("speedKmh");
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
});
