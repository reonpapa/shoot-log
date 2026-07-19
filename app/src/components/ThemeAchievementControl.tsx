import type { SessionReview, ThemeAchievement } from "../domain/shooting";
import "./ThemeAchievementControl.css";

interface Props {
  review: SessionReview;
  theme: string;
  onChange: (review: SessionReview) => void;
}

const options: { value: ThemeAchievement; label: string }[] = [
  { value: "achieved", label: "できた" },
  { value: "partial", label: "一部できた" },
  { value: "not-achieved", label: "できなかった" },
];

export function ThemeAchievementControl({ review, theme, onChange }: Props) {
  if (!theme.trim()) return null;
  return <section className="theme-achievement-control">
    <header><strong>今日の練習テーマは実行できましたか？</strong>{review.themeAchievement && <span>保存済み</span>}</header>
    <div>{options.map((option) => <button type="button" className={review.themeAchievement === option.value ? `selected ${option.value}` : ""} key={option.value} onClick={() => onChange({ ...review, themeAchievement: option.value })}>{option.label}</button>)}</div>
    {["partial", "not-achieved"].includes(review.themeAchievement ?? "") && !review.nextChallenge.trim() && <small>「次回試すこと」が空欄なら、このテーマを次回へ自動で引き継ぎます。</small>}
  </section>;
}
