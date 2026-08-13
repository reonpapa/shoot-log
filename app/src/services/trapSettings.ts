import type { ShootingRound, TrapSetting } from "../domain/shooting";
import { calculateRoundStats } from "../domain/shootingStats";

export interface TrapSettingPreset extends TrapSetting { id: string }

export const iseharaTrapPresets: TrapSettingPreset[] = [
  { id: "isehara-t1", face: "第1面", setType: "ISSF国際セット", distanceMeters: 76, speedKmh: 98, confirmedOn: "2025-07-27", note: "設定目安。必ず当日の掲示を確認してください。" },
  { id: "isehara-t2", face: "第2面", setType: "練習セット", distanceMeters: 55, speedKmh: 78, confirmedOn: "2025-07-27", note: "設定目安。必ず当日の掲示を確認してください。" },
  { id: "isehara-t3", face: "第3面", setType: "ISSF国際セット等", distanceMeters: 65, speedKmh: 95, confirmedOn: "2025-07-27", note: "設定目安。必ず当日の掲示を確認してください。" },
];

export function trapPresetsForRange(rangeName: string): TrapSettingPreset[] {
  return rangeName.includes("伊勢原") ? iseharaTrapPresets : [];
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
    const key = [setting.face, setting.setType, setting.distanceMeters ?? "", setting.speedKmh ?? ""].join("|");
    const group = groups.get(key) ?? { setting, scores: [] };
    group.scores.push(calculateRoundStats(round).score);
    groups.set(key, group);
  }
  return [...groups.entries()].map(([key, group]) => ({
    key,
    label: [group.setting.face, group.setting.setType].filter(Boolean).join("・"),
    rounds: group.scores.length,
    averageScore: group.scores.reduce((sum, score) => sum + score, 0) / group.scores.length,
    distanceMeters: group.setting.distanceMeters,
    speedKmh: group.setting.speedKmh,
  })).sort((a, b) => a.label.localeCompare(b.label, "ja"));
}
