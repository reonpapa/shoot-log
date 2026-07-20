import type { PermitAlertLevel } from "../domain/permit";

export const PERMIT_NOTIFICATION_STORAGE_KEY = "shoot-log-permit-status-seen";

export function createPermitStatusKey(firearmId: string, level: PermitAlertLevel): string {
  return `${firearmId}:${level}`;
}

export function shouldShowPermitNotification(
  previousKey: string | null,
  currentKey: string,
  level: PermitAlertLevel,
): boolean {
  return previousKey !== null && previousKey !== currentKey && level !== "safe";
}
