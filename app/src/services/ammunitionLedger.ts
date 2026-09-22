import type { AmmunitionCategory, AmmunitionLedgerData, AmmunitionProductLink, Firearm, LedgerEntryType, ManualLedgerEntry } from "../domain/ammunition";
import { calculateUnitPrice, emptyAmmunitionLedger, isPurchaseType, isReceiptType } from "../domain/ammunition";
import { getRoundAmmunitionName } from "../domain/shooting";
import type { ShootingRound } from "../domain/shooting";
import { calculateSessionStats } from "../domain/shootingStats";
import type { StoredSession } from "./storage";

const STORAGE_KEY = "shoot-log.ammunition-ledger.v1";
const entryTypes: LedgerEntryType[] = ["opening", "acquisition", "consumption", "disposal", "transfer", "adjustment-in", "adjustment-out"];
const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object";
const isString = (value: unknown): value is string => typeof value === "string";

export function normalizeAmmunitionLedger(value: unknown): AmmunitionLedgerData {
  if (!isRecord(value)) return emptyAmmunitionLedger();
  const categories = Array.isArray(value.categories) ? value.categories.flatMap((item): AmmunitionCategory[] => {
    if (!isRecord(item) || !isString(item.id) || !isString(item.name)) return [];
    return [{ id: item.id, name: item.name, family: item.family === "rifle" ? "rifle" : "shot-shell" }];
  }) : [];
  const categoryIds = new Set(categories.map((item) => item.id));
  const firearms = Array.isArray(value.firearms) ? value.firearms.flatMap((item): Firearm[] => {
    if (!isRecord(item) || !isString(item.id) || !isString(item.name) || !isString(item.identifier)) return [];
    const optionalFields = ["originalPermitDate", "originalPermitNumber", "permitDate", "permitNumber", "inspectionDate", "validUntil", "renewalStartDate", "renewalDeadline", "kind", "actionType", "manufacturer", "model", "overallLength", "barrelLength", "caliber", "magazine", "compatibleAmmo", "purpose"] as const;
    const optional = Object.fromEntries(optionalFields.flatMap((field) => isString(item[field]) ? [[field, item[field]]] : []));
    return [{ id: item.id, name: item.name, identifier: item.identifier, ...optional }];
  }) : [];
  const firearmIds = new Set(firearms.map((item) => item.id));
  const productLinks = Array.isArray(value.productLinks) ? value.productLinks.flatMap((item): AmmunitionProductLink[] => {
    if (!isRecord(item) || !isString(item.ammunitionName) || !isString(item.categoryId) || !categoryIds.has(item.categoryId)) return [];
    return [{ ammunitionName: item.ammunitionName, categoryId: item.categoryId }];
  }) : [];
  const entries = Array.isArray(value.entries) ? value.entries.flatMap((item): ManualLedgerEntry[] => {
    if (!isRecord(item) || !isString(item.id) || !isString(item.date) || !entryTypes.includes(item.type as LedgerEntryType) || !isString(item.categoryId) || !categoryIds.has(item.categoryId) || typeof item.quantity !== "number" || !Number.isFinite(item.quantity) || item.quantity <= 0 || !isString(item.application) || !isString(item.createdAt)) return [];
    const totalAmount = typeof item.totalAmount === "number" && Number.isFinite(item.totalAmount) && item.totalAmount >= 0 && isPurchaseType(item.type as LedgerEntryType) ? item.totalAmount : undefined;
    return [{ id: item.id, date: item.date, type: item.type as LedgerEntryType, categoryId: item.categoryId, quantity: Math.floor(item.quantity), ...(totalAmount === undefined ? {} : { totalAmount }), application: item.application, createdAt: item.createdAt, ...(isString(item.firearmId) && firearmIds.has(item.firearmId) ? { firearmId: item.firearmId } : {}) }];
  }) : [];
  const profile = isRecord(value.permitProfile) ? value.permitProfile : {};
  const permitProfile = { certificateNumber: isString(profile.certificateNumber) ? profile.certificateNumber : "", originalIssueDate: isString(profile.originalIssueDate) ? profile.originalIssueDate : "", issueDate: isString(profile.issueDate) ? profile.issueDate : "" };
  return { trackingStartDate: isString(value.trackingStartDate) ? value.trackingStartDate : "", permitProfile, categories, firearms, productLinks, entries };
}

export function loadAmmunitionLedger(): AmmunitionLedgerData {
  try { return normalizeAmmunitionLedger(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}")); }
  catch { return emptyAmmunitionLedger(); }
}

export function saveAmmunitionLedger(data: AmmunitionLedgerData): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
  catch (error) { console.error("実包管理帳簿の保存に失敗しました。", error); }
}

export interface CalculatedLedgerRow {
  id: string;
  date: string;
  categoryId: string;
  quantity: number;
  signedQuantity: number;
  firearmId?: string;
  application: string;
  totalAmount?: number;
  unitPrice?: number;
  ammunitionName?: string;
  source: "manual" | "session";
  sourceSessionId?: string;
  balanceAfter: Record<string, number>;
  totalAfter: number;
}

interface SessionAmmunitionUsage {
  sessionId: string;
  date: string;
  rangeName: string;
  firearmId?: string;
  ammunitionName: string;
  cartridges: number;
  sortKey: string;
  /** 同じセッションで複数の実包を使った場合に true。 */
  split: boolean;
}

/** 完了セッションの実包消費を、ラウンドごとの使用実包でまとめる。 */
function collectSessionUsage(data: AmmunitionLedgerData, sessions: StoredSession[]): SessionAmmunitionUsage[] {
  return sessions.flatMap((item) => {
    if (item.status !== "completed" || (data.trackingStartDate && item.session.date < data.trackingStartDate)) return [];
    const groups = new Map<string, ShootingRound[]>();
    for (const round of item.rounds) {
      const name = getRoundAmmunitionName(item.session, round);
      if (!name) continue;
      groups.set(name, [...(groups.get(name) ?? []), round]);
    }
    const split = groups.size > 1;
    return [...groups.entries()].flatMap((entry): SessionAmmunitionUsage[] => {
      const [ammunitionName, rounds] = entry;
      const stats = calculateSessionStats({ id: item.id, date: item.session.date, rangeName: item.session.rangeName, ammunitionName, weather: item.session.weather, rounds, sessionMemo: item.session.memo });
      if (stats.cartridgesUsed <= 0) return [];
      return [{
        sessionId: item.id, date: item.session.date, rangeName: item.session.rangeName,
        ...(item.session.firearmId ? { firearmId: item.session.firearmId } : {}),
        ammunitionName, cartridges: stats.cartridgesUsed, sortKey: item.createdAt, split,
      }];
    });
  });
}

export function buildLedgerRows(data: AmmunitionLedgerData, sessions: StoredSession[]): CalculatedLedgerRow[] {
  const manual = data.entries.map((entry) => ({
    id: entry.id, date: entry.date, categoryId: entry.categoryId, quantity: entry.quantity,
    signedQuantity: isReceiptType(entry.type) ? entry.quantity : -entry.quantity,
    ...(entry.firearmId ? { firearmId: entry.firearmId } : {}), application: entry.application,
    ...(entry.totalAmount === undefined ? {} : { totalAmount: entry.totalAmount }),
    source: "manual" as const, sortKey: entry.createdAt,
  }));
  const linkMap = new Map(data.productLinks.map((item) => [item.ammunitionName, item.categoryId]));
  const automatic = collectSessionUsage(data, sessions).flatMap((usage) => {
    const categoryId = linkMap.get(usage.ammunitionName);
    if (!categoryId) return [];
    return [{
      id: usage.split ? `session:${usage.sessionId}:${usage.ammunitionName}` : `session:${usage.sessionId}`,
      date: usage.date, categoryId, quantity: usage.cartridges, signedQuantity: -usage.cartridges,
      ...(usage.firearmId ? { firearmId: usage.firearmId } : {}),
      application: `${usage.rangeName}・標的射撃${usage.split ? `（${usage.ammunitionName}）` : ""}`,
      ammunitionName: usage.ammunitionName,
      source: "session" as const, sourceSessionId: usage.sessionId, sortKey: usage.sortKey,
    }];
  });
  const balances: Record<string, number> = Object.fromEntries(data.categories.map((item) => [item.id, 0]));
  return [...manual, ...automatic].sort((a, b) => a.date.localeCompare(b.date) || a.sortKey.localeCompare(b.sortKey) || a.id.localeCompare(b.id)).map((row) => {
    balances[row.categoryId] = (balances[row.categoryId] ?? 0) + row.signedQuantity;
    const balanceAfter = { ...balances };
    const totalAmount = "totalAmount" in row ? row.totalAmount : undefined;
    const unitPrice = calculateUnitPrice(totalAmount, row.quantity);
    return { id: row.id, date: row.date, categoryId: row.categoryId, quantity: row.quantity, signedQuantity: row.signedQuantity, ...(row.firearmId ? { firearmId: row.firearmId } : {}), application: row.application, ...(totalAmount === undefined ? {} : { totalAmount }), ...(unitPrice === undefined ? {} : { unitPrice }), ...("ammunitionName" in row ? { ammunitionName: row.ammunitionName } : {}), source: row.source, ...("sourceSessionId" in row ? { sourceSessionId: row.sourceSessionId } : {}), balanceAfter, totalAfter: Object.values(balanceAfter).reduce((sum, value) => sum + value, 0) };
  });
}

export interface UnpostedConsumption {
  ammunitionName: string;
  /** 帳簿区分が未設定のため台帳へ転記されていない消費数。 */
  quantity: number;
  sessionCount: number;
}

/** 帳簿区分に紐づいていない実包の消費を集計する。台帳の払いから漏れている分。 */
export function getUnpostedConsumption(data: AmmunitionLedgerData, sessions: StoredSession[]): UnpostedConsumption[] {
  const linked = new Set(data.productLinks.map((item) => item.ammunitionName));
  const totals = new Map<string, { quantity: number; sessions: Set<string> }>();
  for (const usage of collectSessionUsage(data, sessions)) {
    if (linked.has(usage.ammunitionName)) continue;
    const current = totals.get(usage.ammunitionName) ?? { quantity: 0, sessions: new Set<string>() };
    current.quantity += usage.cartridges;
    current.sessions.add(usage.sessionId);
    totals.set(usage.ammunitionName, current);
  }
  return [...totals.entries()]
    .map(([ammunitionName, value]) => ({ ammunitionName, quantity: value.quantity, sessionCount: value.sessions.size }))
    .sort((a, b) => b.quantity - a.quantity || a.ammunitionName.localeCompare(b.ammunitionName, "ja"));
}

export interface PurchaseSummary {
  entryCount: number;
  quantity: number;
  totalAmount: number;
  /** 1発あたりの平均単価。金額のある行がない場合は undefined。 */
  unitPrice?: number;
  byCategory: Record<string, { quantity: number; totalAmount: number; unitPrice?: number }>;
}

/** 購入・譲受のうち金額が入力された行を集計する。from / to は含む。 */
export function summarizePurchases(data: AmmunitionLedgerData, from?: string, to?: string): PurchaseSummary {
  const entries = data.entries.filter((entry) => isPurchaseType(entry.type) && entry.totalAmount !== undefined && (!from || entry.date >= from) && (!to || entry.date <= to));
  const byCategory: PurchaseSummary["byCategory"] = {};
  let quantity = 0;
  let totalAmount = 0;
  for (const entry of entries) {
    quantity += entry.quantity;
    totalAmount += entry.totalAmount ?? 0;
    const current = byCategory[entry.categoryId] ?? { quantity: 0, totalAmount: 0 };
    current.quantity += entry.quantity;
    current.totalAmount += entry.totalAmount ?? 0;
    byCategory[entry.categoryId] = current;
  }
  for (const key of Object.keys(byCategory)) {
    byCategory[key].unitPrice = calculateUnitPrice(byCategory[key].totalAmount, byCategory[key].quantity);
  }
  return { entryCount: entries.length, quantity, totalAmount, unitPrice: calculateUnitPrice(totalAmount, quantity), byCategory };
}

export function mergeAmmunitionLedger(current: AmmunitionLedgerData, imported: AmmunitionLedgerData): AmmunitionLedgerData {
  const categories = new Map(current.categories.map((item) => [item.id, item]));
  imported.categories.forEach((item) => categories.set(item.id, item));
  const firearms = new Map(current.firearms.map((item) => [item.id, item]));
  imported.firearms.forEach((item) => firearms.set(item.id, item));
  const entries = new Map(current.entries.map((item) => [item.id, item]));
  imported.entries.forEach((item) => entries.set(item.id, item));
  const links = new Map(current.productLinks.map((item) => [item.ammunitionName, item]));
  imported.productLinks.forEach((item) => links.set(item.ammunitionName, item));
  return { trackingStartDate: current.trackingStartDate || imported.trackingStartDate, permitProfile: current.permitProfile.certificateNumber ? current.permitProfile : imported.permitProfile, categories: [...categories.values()], firearms: [...firearms.values()], productLinks: [...links.values()], entries: [...entries.values()] };
}
