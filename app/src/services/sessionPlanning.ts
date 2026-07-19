import type { StoredSession } from "./storage";

export interface PracticeThemeProgress {
  sessions: StoredSession[];
  sessionCount: number;
  consecutiveCount: number;
  achievedCount: number;
  partialCount: number;
  notAchievedCount: number;
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

function normalizePracticeTheme(value: string | undefined): string {
  return value?.trim().replace(/\s+/g, " ") ?? "";
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
