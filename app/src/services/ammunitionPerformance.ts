import { getRoundAmmunitionName } from "../domain/shooting";
import type { ShootingRound } from "../domain/shooting";
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
  const grouped = new Map<string, { rounds: ShootingRound[]; sessionIds: Set<string> }>();
  for (const session of sessions) {
    if (session.status !== "completed" || session.rounds.length === 0) continue;
    for (const round of session.rounds) {
      const name = getRoundAmmunitionName(session.session, round);
      if (!name) continue;
      const entry = grouped.get(name) ?? { rounds: [], sessionIds: new Set<string>() };
      entry.rounds.push(round);
      entry.sessionIds.add(session.id);
      grouped.set(name, entry);
    }
  }

  return [...grouped.entries()].map(([ammunitionName, { rounds, sessionIds }]) => {
    const stats = rounds.map(calculateRoundStats);
    const targets = stats.reduce((sum, item) => sum + item.targets, 0);
    const score = stats.reduce((sum, item) => sum + item.score, 0);
    const firstShotHits = stats.reduce((sum, item) => sum + item.firstShotHits, 0);
    return {
      ammunitionName,
      sessionCount: sessionIds.size,
      roundCount: rounds.length,
      averageScore: rounds.length ? score / rounds.length : 0,
      hitRate: targets ? score / targets * 100 : 0,
      firstShotHitRate: targets ? firstShotHits / targets * 100 : 0,
    };
  }).sort((a, b) => b.roundCount - a.roundCount || a.ammunitionName.localeCompare(b.ammunitionName, "ja"));
}
