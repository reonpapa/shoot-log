import type { StoredSession } from "./storage";

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
