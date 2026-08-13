import type { MasterData } from "./masterData";
import { emptyAmmunitionLedger, type AmmunitionLedgerData } from "../domain/ammunition";
import { normalizeAmmunitionLedger } from "./ammunitionLedger";
import { normalizeStoredSession, type StoredSession } from "./storage";

export interface ShootLogBackup {
  app: "shoot-log";
  schemaVersion: 2;
  exportedAt: string;
  sessions: StoredSession[];
  masterData: MasterData;
  ammunitionLedger: AmmunitionLedgerData;
}

export function createBackup(sessions: StoredSession[], masterData: MasterData, ammunitionLedger: AmmunitionLedgerData): ShootLogBackup {
  return { app: "shoot-log", schemaVersion: 2, exportedAt: new Date().toISOString(), sessions, masterData, ammunitionLedger };
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
  const backup = value as Partial<ShootLogBackup> & { schemaVersion?: number };
  if (backup.app !== "shoot-log" || ![1, 2].includes(backup.schemaVersion ?? 0) || !Array.isArray(backup.sessions)) throw new Error("Shoot Logのバックアップではありません。");
  if (!backup.masterData || !Array.isArray(backup.masterData.rangeNames) || !Array.isArray(backup.masterData.ammunitionNames)) throw new Error("マスターデータが不足しています。");
  const sessions = backup.sessions.map(normalizeStoredSession);
  if (sessions.some((session) => session === null)) throw new Error("セッションデータが破損しています。");
  return { app: "shoot-log", schemaVersion: 2, exportedAt: typeof backup.exportedAt === "string" ? backup.exportedAt : new Date().toISOString(), sessions: sessions as StoredSession[], masterData: backup.masterData, ammunitionLedger: backup.schemaVersion === 2 ? normalizeAmmunitionLedger(backup.ammunitionLedger) : emptyAmmunitionLedger() };
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
