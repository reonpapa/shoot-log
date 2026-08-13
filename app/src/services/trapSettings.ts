import type { ShootingRound, TrapSetting } from "../domain/shooting";
import { calculateRoundStats } from "../domain/shootingStats";
import { DEFAULT_RANGE_TRAP_SETTINGS } from "./masterData";

export interface TrapSettingPreset extends TrapSetting { id: string }

export const iseharaTrapPresets: TrapSettingPreset[] = DEFAULT_RANGE_TRAP_SETTINGS.filter((item) => item.rangeName.includes("伊勢原")); /* legacy export */
/*
  { id: "isehara-t1", rangeName: "神奈川県立伊勢原射撃場", face: "第1面", setType: "ISSF国際セット", distanceMeters: 76, speedKmh: 98, confirmedOn: "2025-07-27", note: "設定目安。必ず当日の掲示を確認してください。" },
  { id: "isehara-t2", rangeName: "神奈川県立伊勢原射撃場", face: "第2面", setType: "練習セット", distanceMeters: 55, speedKmh: 78, confirmedOn: "2025-07-27", note: "設定目安。必ず当日の掲示を確認してください。" },
  { id: "isehara-t3", rangeName: "神奈川県立伊勢原射撃場", face: "第3面", setType: "ISSF国際セット等", distanceMeters: 65, speedKmh: 95, confirmedOn: "2025-07-27", note: "設定目安。必ず当日の掲示を確認してください。" },
];

export const ooiTrapPresets: TrapSettingPreset[] = [
  { id: "ooi-international", rangeName: "神奈川大井射撃場", face: "国際射面", setType: "国際セット", distanceMeters: 76, note: "公式掲載値76m±1m。速度は公開情報を確認できないため未設定。必ず当日の掲示を確認してください。" },
  { id: "ooi-american", rangeName: "神奈川大井射撃場", face: "アメリカン射面", setType: "アメリカンセット", distanceMeters: 60, note: "公式掲載値60m±1m。速度は公開情報を確認できないため未設定。必ず当日の掲示を確認してください。" },
];
*/
export const ooiTrapPresets: TrapSettingPreset[] = DEFAULT_RANGE_TRAP_SETTINGS.filter((item) => item.rangeName.includes("大井"));

export function trapPresetsForRange(rangeName: string): TrapSettingPreset[] {
  if (rangeName.includes("伊勢原")) return iseharaTrapPresets;
  if (rangeName.includes("大井")) return ooiTrapPresets;
  return [];
}

export function rangesEquivalent(left: string, right: string): boolean {
  if (left === right) return true;
  if (left.includes("伊勢原") && right.includes("伊勢原")) return true;
  return left.includes("大井") && right.includes("大井");
}

export interface TrapSettingPerformance {
  key: string;
  label: string;
  rounds: number;
  averageScore: number;
  distanceMeters?: number;
  speedKmh?: number;
}

export function getTrapSettingPerformance(rounds: ShootingRound[]): TrapSettingPerformance[] {
  const groups = new Map<string, { setting: TrapSetting; scores: number[] }>();
  for (const round of rounds) {
    const setting = round.trapSetting;
    if (!setting?.face) continue;
    const key = [setting.rangeName, setting.face, setting.setType, setting.distanceMeters ?? "", setting.speedKmh ?? ""].join("|");
    const group = groups.get(key) ?? { setting, scores: [] };
    group.scores.push(calculateRoundStats(round).score);
    groups.set(key, group);
  }
  return [...groups.entries()].map(([key, group]) => ({
    key,
    label: [group.setting.rangeName || "射撃場未設定", group.setting.face, group.setting.setType].filter(Boolean).join("・"),
    rounds: group.scores.length,
    averageScore: group.scores.reduce((sum, score) => sum + score, 0) / group.scores.length,
    distanceMeters: group.setting.distanceMeters,
    speedKmh: group.setting.speedKmh,
  })).sort((a, b) => a.label.localeCompare(b.label, "ja"));
}
