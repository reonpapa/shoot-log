import type { MasterData } from "./masterData";
import type { StoredSession } from "./storage";

export interface ShootLogBackup {
  app: "shoot-log";
  schemaVersion: 1;
  exportedAt: string;
  sessions: StoredSession[];
  masterData: MasterData;
}

export function createBackup(sessions: StoredSession[], masterData: MasterData): ShootLogBackup {
  return { app: "shoot-log", schemaVersion: 1, exportedAt: new Date().toISOString(), sessions, masterData };
}

export function downloadBackup(backup: ShootLogBackup): void {
  const date = new Date().toLocaleDateString("sv-SE");
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `shoot-log-backup-${date}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function parseBackup(text: string): ShootLogBackup {
  const value: unknown = JSON.parse(text);
  if (!value || typeof value !== "object") throw new Error("バックアップ形式が正しくありません。");
  const backup = value as Partial<ShootLogBackup>;
  if (backup.app !== "shoot-log" || backup.schemaVersion !== 1 || !Array.isArray(backup.sessions)) throw new Error("Shoot Logのバックアップではありません。");
  if (!backup.masterData || !Array.isArray(backup.masterData.rangeNames) || !Array.isArray(backup.masterData.ammunitionNames)) throw new Error("マスターデータが不足しています。");
  for (const session of backup.sessions) {
    if (!session || typeof session.id !== "string" || !session.session || !Array.isArray(session.rounds) || typeof session.updatedAt !== "string") throw new Error("セッションデータが破損しています。");
  }
  return backup as ShootLogBackup;
}

export function mergeSessions(current: StoredSession[], imported: StoredSession[]): StoredSession[] {
  const merged = new Map(current.map((item) => [item.id, item]));
  for (const item of imported) {
    const existing = merged.get(item.id);
    if (!existing || item.updatedAt > existing.updatedAt) merged.set(item.id, item);
  }
  return [...merged.values()].sort((a, b) => b.session.date.localeCompare(a.session.date));
}

export function mergeMasterData(current: MasterData, imported: MasterData): MasterData {
  const unique = (values: string[]) => [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ja"));
  return { rangeNames: unique([...current.rangeNames, ...imported.rangeNames]), ammunitionNames: unique([...current.ammunitionNames, ...imported.ammunitionNames]) };
}
