import { calculateRoundStats } from "../domain/shootingStats";
import type { StoredSession } from "./storage";

export interface ConditionPerformance {
  condition: string;
  sessionCount: number;
  roundCount: number;
  averageScore: number;
  hitRate: number;
}

export interface ConditionPerformanceSummary {
  weather: ConditionPerformance[];
  windDirection: ConditionPerformance[];
  windStrength: ConditionPerformance[];
}

export function getConditionPerformance(sessions: StoredSession[]): ConditionPerformanceSummary {
  const completed = sessions.filter((session) => session.status === "completed");
  return {
    weather: groupByCondition(completed, (session) => session.session.weather),
    windDirection: groupByCondition(completed, (session) => session.session.windDirection),
    windStrength: groupByCondition(completed, (session) => session.session.windStrength),
  };
}

function groupByCondition(sessions: StoredSession[], select: (session: StoredSession) => string | undefined): ConditionPerformance[] {
  const groups = new Map<string, StoredSession[]>();
  sessions.forEach((session) => {
    const condition = select(session)?.trim();
    if (!condition || session.rounds.length === 0) return;
    groups.set(condition, [...(groups.get(condition) ?? []), session]);
  });

  return [...groups.entries()].map(([condition, matching]) => {
    const rounds = matching.flatMap((session) => session.rounds);
    const scores = rounds.map((round) => calculateRoundStats(round).score);
    const targets = rounds.reduce((sum, round) => sum + round.shots.filter((shot) => shot.finalResult !== "skip").length, 0);
    const totalScore = scores.reduce((sum, score) => sum + score, 0);
    return {
      condition,
      sessionCount: matching.length,
      roundCount: rounds.length,
      averageScore: totalScore / rounds.length,
      hitRate: targets ? totalScore / targets * 100 : 0,
    };
  }).sort((a, b) => b.roundCount - a.roundCount || a.condition.localeCompare(b.condition, "ja"));
}
