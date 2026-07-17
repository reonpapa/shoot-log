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
  standNo: number;
  firstShotResult: ShotResult;
  secondShotResult: ShotResult;
  finalResult: FinalResult;
  missDirection?: MissDirection;
  memo?: string;
}

export interface ShootingRound {
  id: string;
  roundNo: number;
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

export function createEmptyShot(
  targetNo: number,
  standNo: number,
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

export function createEmptyRound(roundNo: number): ShootingRound {
  const shots = Array.from({ length: 25 }, (_, index) => {
    const targetNo = index + 1;
    const standNo = (index % 5) + 1;

    return createEmptyShot(targetNo, standNo);
  });

  return {
    id: crypto.randomUUID(),
    roundNo,
    shots,
  };
}
