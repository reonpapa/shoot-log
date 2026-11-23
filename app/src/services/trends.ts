import { calculateRoundStats } from "../domain/shootingStats";
import type { StoredSession } from "./storage";
import type { AmmunitionLedgerData } from "../domain/ammunition";
import { isPurchaseType } from "../domain/ammunition";

export interface SessionTrendPoint {
  sessionId: string;
  date: string;
  /** そのセッションの1ラウンド平均スコア。 */
  averageScore: number;
  /** 総合命中率（%）。 */
  hitRate: number;
  /** 初矢命中率（%）。 */
  firstShotHitRate: number;
  rounds: number;
  cartridges: number;
}

/** セッションを日付順に並べ、1回ごとの成績を推移用にまとめる。 */
export function getSessionTrend(sessions: StoredSession[]): SessionTrendPoint[] {
  return sessions
    .filter((item) => item.rounds.length > 0)
    .map((item) => {
      const stats = item.rounds.map(calculateRoundStats);
      const targets = stats.reduce((sum, round) => sum + round.targets, 0);
      const score = stats.reduce((sum, round) => sum + round.score, 0);
      const firstShotHits = stats.reduce((sum, round) => sum + round.firstShotHits, 0);
      return {
        sessionId: item.id,
        date: item.session.date,
        averageScore: stats.length ? score / stats.length : 0,
        hitRate: targets ? score / targets * 100 : 0,
        firstShotHitRate: targets ? firstShotHits / targets * 100 : 0,
        rounds: stats.length,
        cartridges: stats.reduce((sum, round) => sum + round.cartridgesUsed, 0),
      };
    });
}

/**
 * 移動平均。窓が埋まるまでは null を返し、少ないデータで線を引かない。
 */
export function movingAverage(values: number[], windowSize: number): (number | null)[] {
  if (windowSize <= 1) return values.map((value) => value);
  return values.map((_, index) => {
    if (index + 1 < windowSize) return null;
    const window = values.slice(index + 1 - windowSize, index + 1);
    return window.reduce((sum, value) => sum + value, 0) / windowSize;
  });
}

export interface MonthlyAmmunitionPoint {
  /** YYYY-MM。 */
  month: string;
  /** 射撃で消費した発数。 */
  cartridges: number;
  sessions: number;
  /** 購入・譲受のうち金額を入力した行の合計（円）。 */
  purchaseAmount: number;
  purchaseQuantity: number;
}

/** 月ごとの消費発数と購入金額。間の月も0で埋めて並べる。 */
export function getMonthlyAmmunition(sessions: StoredSession[], ledger: AmmunitionLedgerData): MonthlyAmmunitionPoint[] {
  const months = new Map<string, MonthlyAmmunitionPoint>();
  const touch = (month: string) => {
    const current = months.get(month) ?? { month, cartridges: 0, sessions: 0, purchaseAmount: 0, purchaseQuantity: 0 };
    months.set(month, current);
    return current;
  };

  for (const item of sessions) {
    if (item.rounds.length === 0) continue;
    const point = touch(item.session.date.slice(0, 7));
    point.sessions += 1;
    point.cartridges += item.rounds.reduce((sum, round) => sum + calculateRoundStats(round).cartridgesUsed, 0);
  }
  for (const entry of ledger.entries) {
    if (!isPurchaseType(entry.type) || entry.totalAmount === undefined) continue;
    const point = touch(entry.date.slice(0, 7));
    point.purchaseAmount += entry.totalAmount;
    point.purchaseQuantity += entry.quantity;
  }
  if (months.size === 0) return [];

  const sorted = [...months.keys()].sort();
  const filled: MonthlyAmmunitionPoint[] = [];
  const [startYear, startMonth] = sorted[0].split("-").map(Number);
  const [endYear, endMonth] = sorted[sorted.length - 1].split("-").map(Number);
  for (let year = startYear, month = startMonth; year < endYear || (year === endYear && month <= endMonth);) {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    filled.push(months.get(key) ?? { month: key, cartridges: 0, sessions: 0, purchaseAmount: 0, purchaseQuantity: 0 });
    month += 1;
    if (month > 12) { month = 1; year += 1; }
  }
  return filled;
}
