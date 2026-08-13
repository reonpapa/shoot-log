import "./PracticeThemeBanner.css";
import type { ThemeAchievement } from "../domain/shooting";
import { useLanguage } from "../i18n/LanguageContext";

interface Props {
  theme: string;
  compact?: boolean;
  achievement?: ThemeAchievement;
}

export function PracticeThemeBanner({ theme, compact = false, achievement }: Props) {
  const { text } = useLanguage();
  const labels: Record<ThemeAchievement, string> = { achieved: text("できた", "Achieved"), partial: text("一部できた", "Partly achieved"), "not-achieved": text("できなかった", "Not achieved") };
  const value = theme.trim();
  if (!value) return null;
  return <section className={`practice-theme-banner${compact ? " is-compact" : ""}`}>
    <span>TODAY'S FOCUS</span>
    <div><strong>{text("今日の練習テーマ", "Practice focus")}</strong><p>{value}</p>{achievement && <b className={`theme-achievement-badge ${achievement}`}>{text("達成度：", "Result: ")}{labels[achievement]}</b>}</div>
  </section>;
}
