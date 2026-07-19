import "./PracticeThemeBanner.css";
import type { ThemeAchievement } from "../domain/shooting";

interface Props {
  theme: string;
  compact?: boolean;
  achievement?: ThemeAchievement;
}

const labels: Record<ThemeAchievement, string> = { achieved: "できた", partial: "一部できた", "not-achieved": "できなかった" };

export function PracticeThemeBanner({ theme, compact = false, achievement }: Props) {
  const value = theme.trim();
  if (!value) return null;
  return <section className={`practice-theme-banner${compact ? " is-compact" : ""}`}>
    <span>TODAY'S FOCUS</span>
    <div><strong>今日の練習テーマ</strong><p>{value}</p>{achievement && <b className={`theme-achievement-badge ${achievement}`}>達成度：{labels[achievement]}</b>}</div>
  </section>;
}
