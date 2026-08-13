import { describe, expect, it } from "vitest";
import { createEmptyRound } from "../domain/shooting";
import { getTrapSettingPerformance, trapPresetsForRange } from "./trapSettings";

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
});
