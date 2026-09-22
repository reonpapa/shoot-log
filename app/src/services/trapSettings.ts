import type { ShootingRound, TrapSetting } from "../domain/shooting";
import { calculateRoundStats } from "../domain/shootingStats";
import { DEFAULT_RANGE_FACES, DEFAULT_TRAP_SETS, type RangeFace, type TrapSet } from "./masterData";

export function rangesEquivalent(left: string, right: string): boolean {
  if (left === right) return true;
  if (left.includes("伊勢原") && right.includes("伊勢原")) return true;
  return left.includes("大井") && right.includes("大井");
}

/** その射撃場の射面候補。登録が無ければ既定値から探す。 */
export function facesForRange(rangeName: string, faces: RangeFace[] = DEFAULT_RANGE_FACES): RangeFace[] {
  if (!rangeName.trim()) return [];
  const matched = faces.filter((item) => rangesEquivalent(item.rangeName, rangeName));
  if (matched.length > 0) return matched;
  return DEFAULT_RANGE_FACES.filter((item) => rangesEquivalent(item.rangeName, rangeName));
}

/** セットの候補。射撃場をまたいで共通。 */
export function trapSetOptions(sets: TrapSet[] = DEFAULT_TRAP_SETS): TrapSet[] {
  return sets.length > 0 ? sets : DEFAULT_TRAP_SETS;
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
