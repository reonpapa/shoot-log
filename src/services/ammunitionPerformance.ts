import { calculateRoundStats } from "../domain/shootingStats";
import type { StoredSession } from "./storage";

export interface AmmunitionPerformance {
  ammunitionName: string;
  sessionCount: number;
  roundCount: number;
  averageScore: number;
  hitRate: number;
  firstShotHitRate: number;
}

export function getAmmunitionPerformance(sessions: StoredSession[]): AmmunitionPerformance[] {
  const grouped = new Map<string, StoredSession[]>();
  for (const session of sessions) {
    if (session.status !== "completed" || !session.session.ammunitionName.trim() || session.rounds.length === 0) continue;
    const name = session.session.ammunitionName.trim();
    grouped.set(name, [...(grouped.get(name) ?? []), session]);
  }

  return [...grouped.entries()].map(([ammunitionName, items]) => {
    const rounds = items.flatMap((item) => item.rounds);
    const stats = rounds.map(calculateRoundStats);
    const targets = stats.reduce((sum, item) => sum + item.targets, 0);
    const score = stats.reduce((sum, item) => sum + item.score, 0);
    const firstShotHits = stats.reduce((sum, item) => sum + item.firstShotHits, 0);
    return {
      ammunitionName,
      sessionCount: items.length,
      roundCount: rounds.length,
      averageScore: rounds.length ? score / rounds.length : 0,
      hitRate: targets ? score / targets * 100 : 0,
      firstShotHitRate: targets ? firstShotHits / targets * 100 : 0,
    };
  }).sort((a, b) => b.roundCount - a.roundCount || a.ammunitionName.localeCompare(b.ammunitionName, "ja"));
}
