import type { MissDirection, ShootingRound, ShootingSession, Shot } from "./shooting";

export interface RoundStats {
  score: number; targets: number; firstShotHits: number; secondShotHits: number;
  misses: number; expectedCartridgesUsed: number; cartridgesUsed: number; missDirections: Record<MissDirection, number>;
}
export interface SessionStats extends RoundStats { roundScores: number[]; }
export interface StandStats {
  standNo: number;
  targets: number;
  score: number;
  firstShotHits: number;
  secondShotHits: number;
  misses: number;
  missDirections: Record<MissDirection, number>;
}
export interface RoundWindowStats {
  rounds: number;
  averageScore: number;
  firstShotHitRate: number;
}
export interface RoundWindowComparison {
  windowSize: number;
  previous: RoundWindowStats;
  recent: RoundWindowStats;
  averageScoreDelta: number;
  firstShotHitRateDelta: number;
  weakestStand: {
    standNo: number;
    hitRate: number;
    previousHitRate: number;
    delta: number;
  };
}
export interface SessionHalfStats {
  rounds: number;
  averageScore: number;
  hitRate: number;
  firstShotHitRate: number;
}
export interface SessionHalfComparison {
  first: SessionHalfStats;
  second: SessionHalfStats;
  averageScoreDelta: number;
  hitRateDelta: number;
  firstShotHitRateDelta: number;
  trend: "improved" | "stable" | "declined";
}
const directions = (): Record<MissDirection, number> => ({ left: 0, center: 0, right: 0, unknown: 0 });

export function calculateShotCartridges(shot: Shot, round: ShootingRound): number {
  const firstShot = Number(shot.firstShotResult !== "not-fired");
  const secondShot = round.fireMode === "double"
    ? Number(shot.secondShotResult !== "not-fired")
    : 0;
  return firstShot + secondShot;
}

export function calculateRoundStats(round: ShootingRound): RoundStats {
  const result: RoundStats = { score: 0, targets: round.shots.length, firstShotHits: 0, secondShotHits: 0, misses: 0, expectedCartridgesUsed: 0, cartridgesUsed: 0, missDirections: directions() };
  for (const shot of round.shots) {
    result.expectedCartridgesUsed += calculateShotCartridges(shot, round);
    if (shot.finalResult === "hit-on-first") { result.score++; result.firstShotHits++; }
    if (shot.finalResult === "hit-on-second") { result.score++; result.secondShotHits++; }
    if (shot.finalResult === "miss") { result.misses++; result.missDirections[shot.missDirection ?? "unknown"]++; }
  }
  result.cartridgesUsed = round.actualCartridgesUsed ?? result.expectedCartridgesUsed;
  return result;
}

export function calculateSessionStats(session: ShootingSession): SessionStats {
  const result: SessionStats = { score: 0, targets: 0, firstShotHits: 0, secondShotHits: 0, misses: 0, expectedCartridgesUsed: 0, cartridgesUsed: 0, missDirections: directions(), roundScores: [] };
  for (const round of session.rounds) {
    const stats = calculateRoundStats(round);
    result.score += stats.score; result.targets += stats.targets; result.firstShotHits += stats.firstShotHits;
    result.secondShotHits += stats.secondShotHits; result.misses += stats.misses; result.expectedCartridgesUsed += stats.expectedCartridgesUsed; result.cartridgesUsed += stats.cartridgesUsed;
    result.roundScores.push(stats.score);
    for (const direction of Object.keys(result.missDirections) as MissDirection[]) result.missDirections[direction] += stats.missDirections[direction];
  }
  return result;
}

export function calculateStandStats(session: ShootingSession): StandStats[] {
  const result = [1, 2, 3, 4, 5].map((standNo) => ({
    standNo,
    targets: 0,
    score: 0,
    firstShotHits: 0,
    secondShotHits: 0,
    misses: 0,
    missDirections: directions(),
  }));

  for (const round of session.rounds) {
    for (const shot of round.shots) {
      if (shot.finalResult === "skip") continue;
      const stats = result[shot.standNo - 1];
      stats.targets += 1;
      if (shot.finalResult === "hit-on-first") { stats.score += 1; stats.firstShotHits += 1; }
      if (shot.finalResult === "hit-on-second") { stats.score += 1; stats.secondShotHits += 1; }
      if (shot.finalResult === "miss") {
        stats.misses += 1;
        stats.missDirections[shot.missDirection ?? "unknown"] += 1;
      }
    }
  }
  return result;
}

function calculateRoundWindowStats(rounds: ShootingRound[]): RoundWindowStats {
  const stats = rounds.map(calculateRoundStats);
  const targets = stats.reduce((sum, item) => sum + item.targets, 0);
  const score = stats.reduce((sum, item) => sum + item.score, 0);
  const firstShotHits = stats.reduce((sum, item) => sum + item.firstShotHits, 0);
  return {
    rounds: rounds.length,
    averageScore: rounds.length ? score / rounds.length : 0,
    firstShotHitRate: targets ? firstShotHits / targets * 100 : 0,
  };
}

export function calculateRoundWindowComparison(rounds: ShootingRound[], windowSize = 5): RoundWindowComparison | null {
  if (!Number.isInteger(windowSize) || windowSize <= 0 || rounds.length < windowSize * 2) return null;
  const recentRounds = rounds.slice(-windowSize);
  const previousRounds = rounds.slice(-(windowSize * 2), -windowSize);
  const previous = calculateRoundWindowStats(previousRounds);
  const recent = calculateRoundWindowStats(recentRounds);
  const recentStands = calculateStandStats({ id: "recent", date: "", rangeName: "", ammunitionName: "", rounds: recentRounds });
  const previousStands = calculateStandStats({ id: "previous", date: "", rangeName: "", ammunitionName: "", rounds: previousRounds });
  const weakest = recentStands
    .filter((stand) => stand.targets > 0)
    .map((stand) => ({ ...stand, hitRate: stand.score / stand.targets * 100 }))
    .sort((a, b) => a.hitRate - b.hitRate || a.standNo - b.standNo)[0];
  const previousWeakestStand = previousStands.find((stand) => stand.standNo === weakest.standNo);
  const previousHitRate = previousWeakestStand?.targets ? previousWeakestStand.score / previousWeakestStand.targets * 100 : 0;
  return {
    windowSize,
    previous,
    recent,
    averageScoreDelta: recent.averageScore - previous.averageScore,
    firstShotHitRateDelta: recent.firstShotHitRate - previous.firstShotHitRate,
    weakestStand: {
      standNo: weakest.standNo,
      hitRate: weakest.hitRate,
      previousHitRate,
      delta: weakest.hitRate - previousHitRate,
    },
  };
}

function calculateSessionHalfStats(rounds: ShootingRound[]): SessionHalfStats {
  const stats = rounds.map(calculateRoundStats);
  const targets = stats.reduce((sum, item) => sum + item.targets, 0);
  const score = stats.reduce((sum, item) => sum + item.score, 0);
  const firstShotHits = stats.reduce((sum, item) => sum + item.firstShotHits, 0);
  return {
    rounds: rounds.length,
    averageScore: rounds.length ? score / rounds.length : 0,
    hitRate: targets ? score / targets * 100 : 0,
    firstShotHitRate: targets ? firstShotHits / targets * 100 : 0,
  };
}

export function calculateSessionHalfComparison(rounds: ShootingRound[]): SessionHalfComparison | null {
  if (rounds.length < 2) return null;
  const midpoint = Math.ceil(rounds.length / 2);
  const first = calculateSessionHalfStats(rounds.slice(0, midpoint));
  const second = calculateSessionHalfStats(rounds.slice(midpoint));
  const averageScoreDelta = second.averageScore - first.averageScore;
  const hitRateDelta = second.hitRate - first.hitRate;
  const firstShotHitRateDelta = second.firstShotHitRate - first.firstShotHitRate;
  const trend = hitRateDelta <= -5 || firstShotHitRateDelta <= -7
    ? "declined"
    : hitRateDelta >= 5 || firstShotHitRateDelta >= 7
      ? "improved"
      : "stable";
  return { first, second, averageScoreDelta, hitRateDelta, firstShotHitRateDelta, trend };
}
