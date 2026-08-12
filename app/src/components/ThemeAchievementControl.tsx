import type { SessionReview, ThemeAchievement } from "../domain/shooting";
import "./ThemeAchievementControl.css";
import { useLanguage } from "../i18n/LanguageContext";

interface Props {
  review: SessionReview;
  theme: string;
  onChange: (review: SessionReview) => void;
}

export function ThemeAchievementControl({ review, theme, onChange }: Props) {
  const { text } = useLanguage();
  const options: { value: ThemeAchievement; label: string }[] = [{ value: "achieved", label: text("できた", "Achieved") }, { value: "partial", label: text("一部できた", "Partly achieved") }, { value: "not-achieved", label: text("できなかった", "Not achieved") }];
  if (!theme.trim()) return null;
  return <section className="theme-achievement-control">
    <header><strong>{text("今日の練習テーマは実行できましたか？", "Did you achieve today's practice focus?")}</strong>{review.themeAchievement && <span>{text("保存済み", "Saved")}</span>}</header>
    <div>{options.map((option) => <button type="button" className={review.themeAchievement === option.value ? `selected ${option.value}` : ""} key={option.value} onClick={() => onChange({ ...review, themeAchievement: option.value })}>{option.label}</button>)}</div>
    {["partial", "not-achieved"].includes(review.themeAchievement ?? "") && !review.nextChallenge.trim() && <small>{text("「次回試すこと」が空欄なら、このテーマを次回へ自動で引き継ぎます。", "If Next attempt is blank, this focus will carry over automatically.")}</small>}
  </section>;
}
