import type { SessionDetails, ShootingRound } from "../domain/shooting";

const STORAGE_KEY = "shoot-log.sessions.v1";

export interface StoredSession {
  id: string;
  session: SessionDetails;
  rounds: ShootingRound[];
  status: "draft" | "completed";
  createdAt: string;
  updatedAt: string;
}

function isStoredSession(value: unknown): value is StoredSession {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<StoredSession>;
  return typeof item.id === "string" && !!item.session && Array.isArray(item.rounds)
    && (item.status === "draft" || item.status === "completed")
    && typeof item.createdAt === "string" && typeof item.updatedAt === "string";
}

export function loadSessions(): StoredSession[] {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (!value) return [];
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isStoredSession)
      .map((item) => ({
        ...item,
        rounds: item.rounds.map((round) => ({
          ...round,
          fireMode: round.fireMode === "single" ? "single" as const : "double" as const,
          shots: round.shots.map((shot) => (shot.finalResult as string) === "no-bird"
            ? { ...shot, finalResult: "skip" as const }
            : shot),
        })),
      }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
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
