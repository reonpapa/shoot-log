import type { StoredSession } from "./storage";
import { calculateRoundStats } from "../domain/shootingStats";

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
  const previous = [...sessions]
    .filter((item) => item.status === "completed")
    .sort((a, b) => b.session.date.localeCompare(a.session.date) || b.createdAt.localeCompare(a.createdAt))[0];
  if (!previous) return "";
  const nextChallenge = previous.review.nextChallenge.trim();
  if (nextChallenge) return nextChallenge;
  if (["partial", "not-achieved"].includes(previous.review.themeAchievement ?? "")) {
    return previous.session.practiceTheme?.trim() ?? "";
  }
  return "";
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
