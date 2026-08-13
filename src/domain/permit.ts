import type { Firearm } from "./ammunition";

export type PermitAlertLevel = "safe" | "six-months" | "three-months" | "two-months" | "application-open" | "deadline-missed" | "expired" | "incomplete";

export interface PermitStatus {
  level: PermitAlertLevel;
  label: string;
  daysToDeadline: number | null;
  daysToExpiry: number | null;
}

function dateValue(value: string): number {
  const [year, month, day] = value.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

export function localToday(): string {
  return new Date().toLocaleDateString("sv-SE");
}

export function daysBetween(from: string, to: string): number {
  return Math.round((dateValue(to) - dateValue(from)) / 86_400_000);
}

export function getPermitStatus(firearm: Firearm, today = localToday()): PermitStatus {
  if (!firearm.renewalDeadline || !firearm.validUntil) return { level: "incomplete", label: "更新日程未登録", daysToDeadline: null, daysToExpiry: null };
  const daysToDeadline = daysBetween(today, firearm.renewalDeadline);
  const daysToExpiry = daysBetween(today, firearm.validUntil);
  if (daysToExpiry < 0) return { level: "expired", label: "有効期限経過", daysToDeadline, daysToExpiry };
  if (daysToDeadline < 0) return { level: "deadline-missed", label: "更新申請期限経過", daysToDeadline, daysToExpiry };
  if ((firearm.renewalStartDate && today >= firearm.renewalStartDate) || daysToDeadline <= 31) return { level: "application-open", label: "更新申請受付中", daysToDeadline, daysToExpiry };
  if (daysToDeadline <= 62) return { level: "two-months", label: "申請期限まで2か月以内", daysToDeadline, daysToExpiry };
  if (daysToDeadline <= 92) return { level: "three-months", label: "書類確認期間", daysToDeadline, daysToExpiry };
  if (daysToDeadline <= 183) return { level: "six-months", label: "更新準備期間", daysToDeadline, daysToExpiry };
  return { level: "safe", label: "更新まで余裕あり", daysToDeadline, daysToExpiry };
}

export function nearestPermit(firearms: Firearm[]): { firearm: Firearm; status: PermitStatus } | null {
  const candidates = firearms.map((firearm) => ({ firearm, status: getPermitStatus(firearm) }));
  return candidates.sort((a, b) => {
    const aDays = a.status.daysToDeadline ?? Number.POSITIVE_INFINITY;
    const bDays = b.status.daysToDeadline ?? Number.POSITIVE_INFINITY;
    return aDays - bDays;
  })[0] ?? null;
}
