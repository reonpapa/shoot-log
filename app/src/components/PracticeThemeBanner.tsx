import "./PracticeThemeBanner.css";

interface Props {
  theme: string;
  compact?: boolean;
}

export function PracticeThemeBanner({ theme, compact = false }: Props) {
  const value = theme.trim();
  if (!value) return null;
  return <section className={`practice-theme-banner${compact ? " is-compact" : ""}`}>
    <span>TODAY'S FOCUS</span>
    <div><strong>今日の練習テーマ</strong><p>{value}</p></div>
  </section>;
}
