import type {
  MissDirection,
  ShootingRound,
  ShootingSession,
  Shot,
} from "./shooting";

export interface RoundStats {
  score: number;
  targets: number;
  firstShotHits: number;
  secondShotHits: number;
  misses: number;
  cartridgesUsed: number;
  missDirections: Record<MissDirection, number>;
}

export interface SessionStats extends RoundStats {
  roundScores: number[];
}

const emptyMissDirections = (): Record<MissDirection, number> => ({
  left: 0,
  center: 0,
  right: 0,
  unknown: 0,
});

export function calculateShotCartridges(shot: Shot): number {
  let total = 0;

  if (shot.firstShotResult !== "not-fired") {
    total += 1;
  }

  if (shot.secondShotResult !== "not-fired") {
    total += 1;
  }

  return total;
}

export function calculateRoundStats(round: ShootingRound): RoundStats {
  const stats: RoundStats = {
    score: 0,
    targets: round.shots.length,
    firstShotHits: 0,
    secondShotHits: 0,
    misses: 0,
    cartridgesUsed: 0,
    missDirections: emptyMissDirections(),
  };

  for (const shot of round.shots) {
    stats.cartridgesUsed += calculateShotCartridges(shot);

    if (shot.finalResult === "hit-on-first") {
      stats.score += 1;
      stats.firstShotHits += 1;
    }

    if (shot.finalResult === "hit-on-second") {
      stats.score += 1;
      stats.secondShotHits += 1;
    }

    if (shot.finalResult === "miss") {
      stats.misses += 1;

      const direction = shot.missDirection ?? "unknown";
      stats.missDirections[direction] += 1;
    }
  }

  return stats;
}

export function calculateSessionStats(
  session: ShootingSession,
): SessionStats {
  const result: SessionStats = {
    score: 0,
    targets: 0,
    firstShotHits: 0,
    secondShotHits: 0,
    misses: 0,
    cartridgesUsed: 0,
    missDirections: emptyMissDirections(),
    roundScores: [],
  };

  for (const round of session.rounds) {
    const roundStats = calculateRoundStats(round);

    result.score += roundStats.score;
    result.targets += roundStats.targets;
    result.firstShotHits += roundStats.firstShotHits;
    result.secondShotHits += roundStats.secondShotHits;
    result.misses += roundStats.misses;
    result.cartridgesUsed += roundStats.cartridgesUsed;
    result.roundScores.push(roundStats.score);

    result.missDirections.left += roundStats.missDirections.left;
    result.missDirections.center += roundStats.missDirections.center;
    result.missDirections.right += roundStats.missDirections.right;
    result.missDirections.unknown += roundStats.missDirections.unknown;
  }

  return result;
}
