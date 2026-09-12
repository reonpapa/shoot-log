export type StandNo = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type Discipline = "trap" | "skeet" | "sporting";
export type FireMode = "single" | "double";
export type ShotResult = "hit" | "miss" | "not-fired";
export type FinalResult = "hit-on-first" | "hit-on-second" | "miss" | "skip";
export type MissDirection = "left" | "center" | "right" | "unknown";

export interface TrapSetting {
  rangeName: string;
  face: string;
  setType: string;
  distanceMeters?: number;
  speedKmh?: number;
  confirmedOn?: string;
  note?: string;
}

export interface SessionDetails {
  date: string;
  rangeName: string;
  discipline: Discipline;
  /** 主に使用した実包。互換性のため単一値を保持する。 */
  ammunitionName: string;
  /** セッションで使用した実包の一覧（1件目が ammunitionName と一致する）。 */
  ammunitionNames?: string[];
  firearmId?: string;
  practiceTheme?: string;
  weather: string;
  temperature?: string;
  windDirection?: string;
  windStrength?: string;
  memo: string;
}

export interface SessionReview {
  findings: string;
  problems: string;
  nextChallenge: string;
  themeAchievement?: ThemeAchievement;
}

export type ThemeAchievement = "achieved" | "partial" | "not-achieved";

export interface Shot {
  id: string;
  targetNo: number;
  standNo: StandNo;
  firstShotResult: ShotResult;
  secondShotResult: ShotResult;
  /** 初矢命中後に、二発目も発射した場合の実発射記録。 */
  secondShotFiredAfterFirstHit?: boolean;
  finalResult: FinalResult;
  /** 失中したクレーの飛翔方向。散弾が外れた方向ではない。 */
  missDirection?: MissDirection;
  memo?: string;
  /** Skeet preview: target house and pair grouping in the ISSF qualification sequence. */
  skeetHouse?: "high" | "low";
  skeetPairId?: string;
  skeetPairOrder?: 1 | 2;
}

const skeetSequence: Array<{ standNo: StandNo; house: "high" | "low"; pair?: string; order?: 1 | 2 }> = [
  { standNo: 1, house: "high" }, { standNo: 1, house: "high", pair: "1-a", order: 1 }, { standNo: 1, house: "low", pair: "1-a", order: 2 },
  { standNo: 2, house: "high" }, { standNo: 2, house: "high", pair: "2-a", order: 1 }, { standNo: 2, house: "low", pair: "2-a", order: 2 },
  { standNo: 3, house: "high" }, { standNo: 3, house: "high", pair: "3-a", order: 1 }, { standNo: 3, house: "low", pair: "3-a", order: 2 },
  { standNo: 4, house: "high" }, { standNo: 4, house: "low" },
  { standNo: 5, house: "low" }, { standNo: 5, house: "low", pair: "5-a", order: 1 }, { standNo: 5, house: "high", pair: "5-a", order: 2 },
  { standNo: 6, house: "low" }, { standNo: 6, house: "low", pair: "6-a", order: 1 }, { standNo: 6, house: "high", pair: "6-a", order: 2 },
  { standNo: 7, house: "low", pair: "7-a", order: 1 }, { standNo: 7, house: "high", pair: "7-a", order: 2 },
  { standNo: 4, house: "high", pair: "4-b", order: 1 }, { standNo: 4, house: "low", pair: "4-b", order: 2 },
  { standNo: 4, house: "low", pair: "4-c", order: 1 }, { standNo: 4, house: "high", pair: "4-c", order: 2 },
  { standNo: 8, house: "high" }, { standNo: 8, house: "low" },
];

export function createEmptySkeetRound(roundNo: number): ShootingRound {
  return {
    id: crypto.randomUUID(), roundNo, startStandNo: 1, fireMode: "single",
    shots: skeetSequence.map((target, index) => ({
      id: crypto.randomUUID(), targetNo: index + 1, standNo: target.standNo,
      firstShotResult: "not-fired", secondShotResult: "not-fired", finalResult: "skip",
      skeetHouse: target.house,
      ...(target.pair ? { skeetPairId: target.pair, skeetPairOrder: target.order } : {}),
    })),
  };
}

export interface ShootingRound {
  id: string;
  roundNo: number;
  startStandNo: StandNo;
  fireMode: FireMode;
  /** このラウンドで使用した実包。未設定ならセッションの主実包を使う。 */
  ammunitionName?: string;
  actualCartridgesUsed?: number;
  trapSetting?: TrapSetting;
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

/** セッションで使用した実包名の一覧（重複と空文字を除く）。 */
export function getSessionAmmunitionNames(session: Pick<SessionDetails, "ammunitionName" | "ammunitionNames">): string[] {
  const names = [session.ammunitionName, ...(session.ammunitionNames ?? [])]
    .map((value) => (value ?? "").trim())
    .filter(Boolean);
  return [...new Set(names)];
}

/** ラウンドで実際に使用した実包名。未設定や不正値はセッションの主実包へ戻す。 */
export function getRoundAmmunitionName(session: Pick<SessionDetails, "ammunitionName" | "ammunitionNames">, round: Pick<ShootingRound, "ammunitionName">): string {
  const names = getSessionAmmunitionNames(session);
  const selected = (round.ammunitionName ?? "").trim();
  if (selected && names.includes(selected)) return selected;
  return names[0] ?? "";
}

export function calculateStandNo(startStandNo: StandNo, shotIndex: number): StandNo {
  return (((startStandNo - 1 + shotIndex) % 5) + 1) as StandNo;
}

export function createEmptyRound(roundNo: number, startStandNo: StandNo = 1): ShootingRound {
  return {
    id: crypto.randomUUID(),
    roundNo,
    startStandNo,
    fireMode: "double",
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
