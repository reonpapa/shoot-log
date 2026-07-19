import type { FinalResult, MissDirection, SessionDetails, SessionReview, ShootingRound, ShotResult, StandNo } from "../domain/shooting";

const STORAGE_KEY = "shoot-log.sessions.v1";

export interface StoredSession {
  id: string;
  session: SessionDetails;
  rounds: ShootingRound[];
  review: SessionReview;
  status: "draft" | "completed";
  createdAt: string;
  updatedAt: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object";
const isString = (value: unknown): value is string => typeof value === "string";
const isStand = (value: unknown): value is StandNo => [1, 2, 3, 4, 5].includes(value as number);
const shotResults: ShotResult[] = ["hit", "miss", "not-fired"];
const finalResults: FinalResult[] = ["hit-on-first", "hit-on-second", "miss", "skip"];
const missDirections: MissDirection[] = ["left", "center", "right", "unknown"];

function normalizeRound(value: unknown): ShootingRound | null {
  if (!isRecord(value) || !isString(value.id) || typeof value.roundNo !== "number" || !isStand(value.startStandNo) || !Array.isArray(value.shots) || value.shots.length !== 25) return null;
  const shots = value.shots.map((shot): ShootingRound["shots"][number] | null => {
    if (!isRecord(shot) || !isString(shot.id) || typeof shot.targetNo !== "number" || !isStand(shot.standNo) || !shotResults.includes(shot.firstShotResult as ShotResult) || !shotResults.includes(shot.secondShotResult as ShotResult)) return null;
    const legacyResult = shot.finalResult === "no-bird" ? "skip" : shot.finalResult;
    if (!finalResults.includes(legacyResult as FinalResult)) return null;
    const direction = missDirections.includes(shot.missDirection as MissDirection) ? shot.missDirection as MissDirection : undefined;
    return { id: shot.id, targetNo: shot.targetNo, standNo: shot.standNo, firstShotResult: shot.firstShotResult as ShotResult, secondShotResult: shot.secondShotResult as ShotResult, finalResult: legacyResult as FinalResult, ...(direction ? { missDirection: direction } : {}), ...(isString(shot.memo) ? { memo: shot.memo } : {}) };
  });
  if (shots.some((shot) => shot === null)) return null;
  const actual = typeof value.actualCartridgesUsed === "number" && Number.isFinite(value.actualCartridgesUsed) && value.actualCartridgesUsed >= 0 ? value.actualCartridgesUsed : undefined;
  return { id: value.id, roundNo: value.roundNo, startStandNo: value.startStandNo, fireMode: value.fireMode === "single" ? "single" : "double", shots: shots as ShootingRound["shots"], ...(actual !== undefined ? { actualCartridgesUsed: actual } : {}), ...(isString(value.memo) ? { memo: value.memo } : {}) };
}

export function normalizeStoredSession(value: unknown): StoredSession | null {
  if (!isRecord(value) || !isString(value.id) || !isRecord(value.session) || !Array.isArray(value.rounds) || !isString(value.createdAt) || !isString(value.updatedAt)) return null;
  const details = value.session;
  if (!isString(details.date) || !isString(details.rangeName) || !["trap", "skeet", "sporting"].includes(details.discipline as string) || !isString(details.ammunitionName)) return null;
  const rounds = value.rounds.map(normalizeRound);
  if (rounds.length === 0 || rounds.some((round) => round === null)) return null;
  const review = isRecord(value.review) ? value.review : {};
  return {
    id: value.id,
    session: { date: details.date, rangeName: details.rangeName, discipline: details.discipline as SessionDetails["discipline"], ammunitionName: details.ammunitionName, ...(isString(details.firearmId) ? { firearmId: details.firearmId } : {}), practiceTheme: isString(details.practiceTheme) ? details.practiceTheme : "", weather: isString(details.weather) ? details.weather : "", memo: isString(details.memo) ? details.memo : "" },
    rounds: rounds as ShootingRound[],
    review: { findings: isString(review.findings) ? review.findings : "", problems: isString(review.problems) ? review.problems : "", nextChallenge: isString(review.nextChallenge) ? review.nextChallenge : "" },
    status: value.status === "completed" ? "completed" : "draft",
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

export function loadSessions(): StoredSession[] {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (!value) return [];
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeStoredSession).filter((item): item is StoredSession => item !== null).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

export function saveSessions(sessions: StoredSession[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (error) {
    console.error("Shoot Logの保存に失敗しました。", error);
  }
}
