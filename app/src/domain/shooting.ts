export type StandNo = 1 | 2 | 3 | 4 | 5;
export type Discipline = "trap" | "skeet" | "sporting";
export type FireMode = "single" | "double";
export type ShotResult = "hit" | "miss" | "not-fired";
export type FinalResult = "hit-on-first" | "hit-on-second" | "miss" | "skip";
export type MissDirection = "left" | "center" | "right" | "unknown";

export interface SessionDetails {
  date: string;
  rangeName: string;
  discipline: Discipline;
  ammunitionName: string;
  firearmId?: string;
  weather: string;
  memo: string;
}

export interface SessionReview {
  findings: string;
  problems: string;
  nextChallenge: string;
}

export interface Shot {
  id: string;
  targetNo: number;
  standNo: StandNo;
  firstShotResult: ShotResult;
  secondShotResult: ShotResult;
  finalResult: FinalResult;
  /** 失中したクレーの飛翔方向。散弾が外れた方向ではない。 */
  missDirection?: MissDirection;
  memo?: string;
}

export interface ShootingRound {
  id: string;
  roundNo: number;
  startStandNo: StandNo;
  fireMode: FireMode;
  actualCartridgesUsed?: number;
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
}

export function calculateStandNo(startStandNo: StandNo, shotIndex: number): StandNo {
  return (((startStandNo - 1 + shotIndex) % 5) + 1) as StandNo;
}

export function createEmptyRound(roundNo: number, startStandNo: StandNo = 1): ShootingRound {
  return {
    id: crypto.randomUUID(),
    roundNo,
    startStandNo,
    fireMode: "single",
    shots: Array.from({ length: 25 }, (_, index) => ({
      id: crypto.randomUUID(),
      targetNo: index + 1,
      standNo: calculateStandNo(startStandNo, index),
      firstShotResult: "not-fired" as const,
      secondShotResult: "not-fired" as const,
      finalResult: "skip" as const,
    })),
  };
}

export function changeRoundStartStand(round: ShootingRound, startStandNo: StandNo): ShootingRound {
  return {
    ...round,
    startStandNo,
    shots: round.shots.map((shot, index) => ({
      ...shot,
      standNo: calculateStandNo(startStandNo, index),
    })),
  };
}

export function changeShotStand(round: ShootingRound, shotId: string, standNo: StandNo): ShootingRound {
  return {
    ...round,
    shots: round.shots.map((shot) => shot.id === shotId ? { ...shot, standNo } : shot),
  };
}
