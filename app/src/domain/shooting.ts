export type StandNo = 1 | 2 | 3 | 4 | 5;

export type ShotResult = "hit" | "miss" | "not-fired";

export type FinalResult =
  | "hit-on-first"
  | "hit-on-second"
  | "miss"
  | "no-bird"
  | "skip";

export type MissDirection =
  | "left"
  | "center"
  | "right"
  | "unknown";

export interface Shot {
  id: string;
  targetNo: number;
  standNo: StandNo;
  firstShotResult: ShotResult;
  secondShotResult: ShotResult;
  finalResult: FinalResult;
  missDirection?: MissDirection;
  memo?: string;
}

export interface ShootingRound {
  id: string;
  roundNo: number;
  startStandNo: StandNo;
  shots: Shot[];
  memo?: string;
}

export interface ShootingSession {
  id: string;
  date: string;
  rangeName: string;
  ammunitionName: string;
  weather?: string;
  rounds: ShootingRound[];
  sessionMemo?: string;
  findings?: string;
  problems?: string;
  nextChallenge?: string;
}

export function calculateStandNo(
  startStandNo: StandNo,
  shotIndex: number,
): StandNo {
  return (((startStandNo - 1 + shotIndex) % 5) + 1) as StandNo;
}

export function createEmptyShot(
  targetNo: number,
  standNo: StandNo,
): Shot {
  return {
    id: crypto.randomUUID(),
    targetNo,
    standNo,
    firstShotResult: "not-fired",
    secondShotResult: "not-fired",
    finalResult: "skip",
  };
}

export function createEmptyRound(
  roundNo: number,
  startStandNo: StandNo = 1,
): ShootingRound {
  const shots = Array.from({ length: 25 }, (_, index) => {
    const targetNo = index + 1;
    const standNo = calculateStandNo(startStandNo, index);

    return createEmptyShot(targetNo, standNo);
  });

  return {
    id: crypto.randomUUID(),
    roundNo,
    startStandNo,
    shots,
  };
}

/**
 * 開始射台を変更し、25枚分の射台番号だけを再計算する。
 * 命中・失中などの入力済み結果は維持する。
 */
export function changeRoundStartStand(
  round: ShootingRound,
  startStandNo: StandNo,
): ShootingRound {
  return {
    ...round,
    startStandNo,
    shots: round.shots.map((shot, index) => ({
      ...shot,
      standNo: calculateStandNo(startStandNo, index),
    })),
  };
}

/**
 * 1枚だけ実際の射台番号へ修正する。
 */
export function changeShotStand(
  round: ShootingRound,
  shotId: string,
  standNo: StandNo,
): ShootingRound {
  return {
    ...round,
    shots: round.shots.map((shot) =>
      shot.id === shotId
        ? {
            ...shot,
            standNo,
          }
        : shot,
    ),
  };
}
