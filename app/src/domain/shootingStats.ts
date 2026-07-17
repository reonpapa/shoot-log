import type { MissDirection, ShootingRound, ShootingSession, Shot } from "./shooting";

export interface RoundStats {
  score: number; targets: number; firstShotHits: number; secondShotHits: number;
  misses: number; expectedCartridgesUsed: number; cartridgesUsed: number; missDirections: Record<MissDirection, number>;
}
export interface SessionStats extends RoundStats { roundScores: number[]; }
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
