import type { StoredSession } from "./storage";
import { calculateRoundStats, calculateStandStats } from "../domain/shootingStats";

export interface PracticeRecommendation {
  theme: string;
  reason: string;
  source: "next-challenge" | "continue-theme" | "weakest-stand" | "miss-direction" | "first-shot";
}

export interface PracticeThemeProgress {
  sessions: StoredSession[];
  sessionCount: number;
  consecutiveCount: number;
  achievedCount: number;
  partialCount: number;
  notAchievedCount: number;
}

export interface PracticeThemeSummary {
  theme: string;
  latestDate: string;
  sessionCount: number;
  ratedCount: number;
  achievedCount: number;
  achievementRate: number | null;
  averageScore: number | null;
}

export function getSuggestedPracticeTheme(sessions: StoredSession[]): string {
  return getPracticeRecommendation(sessions)?.theme ?? "";
}

export function getPracticeRecommendation(sessions: StoredSession[]): PracticeRecommendation | null {
  const previous = [...sessions]
    .filter((item) => item.status === "completed")
    .sort((a, b) => b.session.date.localeCompare(a.session.date) || b.createdAt.localeCompare(a.createdAt))[0];
  if (!previous) return null;
  const nextChallenge = previous.review.nextChallenge.trim();
  if (nextChallenge) return { theme: nextChallenge, reason: "前回の振り返りで「次回試すこと」に記録されています。", source: "next-challenge" };
  if (["partial", "not-achieved"].includes(previous.review.themeAchievement ?? "")) {
    const theme = previous.session.practiceTheme?.trim() ?? "";
    if (theme) return { theme, reason: "前回の達成度が「一部できた」または「できなかった」ため、継続を提案します。", source: "continue-theme" };
  }

  return getScoreBasedPracticeRecommendation(sessions);
}

export function getScoreBasedPracticeRecommendation(sessions: StoredSession[]): PracticeRecommendation | null {
  const recent = [...sessions]
    .filter((item) => item.status === "completed")
    .sort((a, b) => b.session.date.localeCompare(a.session.date) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);
  const rounds = recent.flatMap((item) => item.rounds);
  const enteredShots = rounds.flatMap((round) => round.shots).filter((shot) => shot.finalResult !== "skip");
  if (enteredShots.length < 50) return null;

  const standStats = calculateStandStats({ id: "practice-recommendation", date: "", rangeName: "", ammunitionName: "", rounds });
  const weakest = standStats
    .filter((stand) => stand.targets >= 10)
    .map((stand) => ({ ...stand, hitRate: stand.score / stand.targets * 100 }))
    .sort((a, b) => a.hitRate - b.hitRate || a.standNo - b.standNo)[0];
  const totalHits = enteredShots.filter((shot) => shot.finalResult === "hit-on-first" || shot.finalResult === "hit-on-second").length;
  const overallHitRate = totalHits / enteredShots.length * 100;
  if (weakest && weakest.hitRate <= overallHitRate - 8) {
    return {
      theme: `Stand ${weakest.standNo}でクレーをよく見て、丁寧に撃つ`,
      reason: `直近${recent.length}回ではStand ${weakest.standNo}の命中率が${Math.round(weakest.hitRate)}%で、全体より${Math.round(overallHitRate - weakest.hitRate)}ポイント低くなっています。`,
      source: "weakest-stand",
    };
  }

  const misses = enteredShots.filter((shot) => shot.finalResult === "miss");
  const knownMisses = misses.filter((shot) => shot.missDirection && shot.missDirection !== "unknown");
  const directionCounts = { left: 0, center: 0, right: 0 };
  for (const shot of knownMisses) directionCounts[shot.missDirection as keyof typeof directionCounts] += 1;
  const dominantDirection = (Object.entries(directionCounts) as [keyof typeof directionCounts, number][])
    .sort((a, b) => b[1] - a[1])[0];
  if (dominantDirection && dominantDirection[1] >= 3 && dominantDirection[1] / Math.max(knownMisses.length, 1) >= 0.45) {
    const label = { left: "左方向", center: "ストレート", right: "右方向" }[dominantDirection[0]];
    return {
      theme: `${label}のクレーを最後まで見続ける`,
      reason: `方向を記録した直近の失中${knownMisses.length}枚のうち、${label}が${dominantDirection[1]}枚と最も多くなっています。`,
      source: "miss-direction",
    };
  }

  const firstShotHits = enteredShots.filter((shot) => shot.finalResult === "hit-on-first").length;
  const firstShotRate = firstShotHits / enteredShots.length * 100;
  if (firstShotRate < 70) {
    return {
      theme: "初矢を急がず、クレーを見てから銃を動かす",
      reason: `直近${recent.length}回の初矢命中率が${Math.round(firstShotRate)}%のため、初矢の安定を提案します。`,
      source: "first-shot",
    };
  }
  return null;
}

export function normalizePracticeTheme(value: string | undefined): string {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

export function isSamePracticeTheme(first: string | undefined, second: string | undefined): boolean {
  const normalizedFirst = normalizePracticeTheme(first);
  return normalizedFirst !== "" && normalizedFirst === normalizePracticeTheme(second);
}

export function filterSessionsByPracticeTheme(sessions: StoredSession[], theme: string): StoredSession[] {
  const target = normalizePracticeTheme(theme);
  if (!target) return sessions;
  return sessions.filter((item) =>
    normalizePracticeTheme(item.session.practiceTheme) === target
    || normalizePracticeTheme(item.review.nextChallenge) === target
  );
}

export function getPracticeThemeProgress(sessions: StoredSession[], theme: string): PracticeThemeProgress {
  const target = normalizePracticeTheme(theme);
  const completed = [...sessions]
    .filter((item) => item.status === "completed")
    .sort((a, b) => b.session.date.localeCompare(a.session.date) || b.createdAt.localeCompare(a.createdAt));
  const themed = target
    ? completed.filter((item) => normalizePracticeTheme(item.session.practiceTheme) === target).reverse()
    : [];

  let consecutiveCount = 0;
  for (const item of completed) {
    if (normalizePracticeTheme(item.session.practiceTheme) !== target || !target) break;
    consecutiveCount += 1;
  }

  return {
    sessions: themed,
    sessionCount: themed.length,
    consecutiveCount,
    achievedCount: themed.filter((item) => item.review.themeAchievement === "achieved").length,
    partialCount: themed.filter((item) => item.review.themeAchievement === "partial").length,
    notAchievedCount: themed.filter((item) => item.review.themeAchievement === "not-achieved").length,
  };
}

export function getPracticeThemeHistory(sessions: StoredSession[]): PracticeThemeSummary[] {
  const completed = [...sessions]
    .filter((item) => item.status === "completed" && normalizePracticeTheme(item.session.practiceTheme))
    .sort((a, b) => b.session.date.localeCompare(a.session.date) || b.createdAt.localeCompare(a.createdAt));
  const grouped = new Map<string, { theme: string; sessions: StoredSession[] }>();

  for (const item of completed) {
    const normalized = normalizePracticeTheme(item.session.practiceTheme);
    const existing = grouped.get(normalized);
    if (existing) existing.sessions.push(item);
    else grouped.set(normalized, { theme: item.session.practiceTheme?.trim() ?? normalized, sessions: [item] });
  }

  return [...grouped.values()].map(({ theme, sessions: themed }) => {
    const rated = themed.filter((item) => item.review.themeAchievement);
    const achievedCount = rated.filter((item) => item.review.themeAchievement === "achieved").length;
    const rounds = themed.flatMap((item) => item.rounds);
    const totalScore = rounds.reduce((sum, round) => sum + calculateRoundStats(round).score, 0);
    return {
      theme,
      latestDate: themed[0].session.date,
      sessionCount: themed.length,
      ratedCount: rated.length,
      achievedCount,
      achievementRate: rated.length ? achievedCount / rated.length * 100 : null,
      averageScore: rounds.length ? totalScore / rounds.length : null,
    };
  });
}
