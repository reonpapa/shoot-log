import type { AmmunitionCategory, AmmunitionLedgerData, AmmunitionProductLink, Firearm, LedgerEntryType, ManualLedgerEntry } from "../domain/ammunition";
import { emptyAmmunitionLedger, isReceiptType } from "../domain/ammunition";
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
    return [{ id: item.id, name: item.name, identifier: item.identifier }];
  }) : [];
  const firearmIds = new Set(firearms.map((item) => item.id));
  const productLinks = Array.isArray(value.productLinks) ? value.productLinks.flatMap((item): AmmunitionProductLink[] => {
    if (!isRecord(item) || !isString(item.ammunitionName) || !isString(item.categoryId) || !categoryIds.has(item.categoryId)) return [];
    return [{ ammunitionName: item.ammunitionName, categoryId: item.categoryId }];
  }) : [];
  const entries = Array.isArray(value.entries) ? value.entries.flatMap((item): ManualLedgerEntry[] => {
    if (!isRecord(item) || !isString(item.id) || !isString(item.date) || !entryTypes.includes(item.type as LedgerEntryType) || !isString(item.categoryId) || !categoryIds.has(item.categoryId) || typeof item.quantity !== "number" || !Number.isFinite(item.quantity) || item.quantity <= 0 || !isString(item.application) || !isString(item.createdAt)) return [];
    return [{ id: item.id, date: item.date, type: item.type as LedgerEntryType, categoryId: item.categoryId, quantity: Math.floor(item.quantity), application: item.application, createdAt: item.createdAt, ...(isString(item.firearmId) && firearmIds.has(item.firearmId) ? { firearmId: item.firearmId } : {}) }];
  }) : [];
  return { trackingStartDate: isString(value.trackingStartDate) ? value.trackingStartDate : "", categories, firearms, productLinks, entries };
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
  source: "manual" | "session";
  sourceSessionId?: string;
  balanceAfter: Record<string, number>;
  totalAfter: number;
}

export function buildLedgerRows(data: AmmunitionLedgerData, sessions: StoredSession[]): CalculatedLedgerRow[] {
  const manual = data.entries.map((entry) => ({
    id: entry.id, date: entry.date, categoryId: entry.categoryId, quantity: entry.quantity,
    signedQuantity: isReceiptType(entry.type) ? entry.quantity : -entry.quantity,
    ...(entry.firearmId ? { firearmId: entry.firearmId } : {}), application: entry.application,
    source: "manual" as const, sortKey: entry.createdAt,
  }));
  const linkMap = new Map(data.productLinks.map((item) => [item.ammunitionName, item.categoryId]));
  const automatic = sessions.flatMap((item) => {
    if (item.status !== "completed" || (data.trackingStartDate && item.session.date < data.trackingStartDate)) return [];
    const categoryId = linkMap.get(item.session.ammunitionName);
    if (!categoryId) return [];
    const stats = calculateSessionStats({ id: item.id, date: item.session.date, rangeName: item.session.rangeName, ammunitionName: item.session.ammunitionName, weather: item.session.weather, rounds: item.rounds, sessionMemo: item.session.memo });
    if (stats.cartridgesUsed <= 0) return [];
    return [{ id: `session:${item.id}`, date: item.session.date, categoryId, quantity: stats.cartridgesUsed, signedQuantity: -stats.cartridgesUsed, ...(item.session.firearmId ? { firearmId: item.session.firearmId } : {}), application: `${item.session.rangeName}・標的射撃`, source: "session" as const, sourceSessionId: item.id, sortKey: item.createdAt }];
  });
  const balances: Record<string, number> = Object.fromEntries(data.categories.map((item) => [item.id, 0]));
  return [...manual, ...automatic].sort((a, b) => a.date.localeCompare(b.date) || a.sortKey.localeCompare(b.sortKey) || a.id.localeCompare(b.id)).map((row) => {
    balances[row.categoryId] = (balances[row.categoryId] ?? 0) + row.signedQuantity;
    const balanceAfter = { ...balances };
    return { id: row.id, date: row.date, categoryId: row.categoryId, quantity: row.quantity, signedQuantity: row.signedQuantity, ...(row.firearmId ? { firearmId: row.firearmId } : {}), application: row.application, source: row.source, ...("sourceSessionId" in row ? { sourceSessionId: row.sourceSessionId } : {}), balanceAfter, totalAfter: Object.values(balanceAfter).reduce((sum, value) => sum + value, 0) };
  });
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
  return { trackingStartDate: current.trackingStartDate || imported.trackingStartDate, categories: [...categories.values()], firearms: [...firearms.values()], productLinks: [...links.values()], entries: [...entries.values()] };
}
