import { useEffect, useRef, useState, type ChangeEvent } from "react";
import type { SessionReview } from "../domain/shooting";
import type { PracticeRecommendation } from "../services/sessionPlanning";
import "./SessionReviewForm.css";
import { useLanguage } from "../i18n/LanguageContext";

interface Props { review: SessionReview; advice: PracticeRecommendation | null; onSave: (review: SessionReview) => void; onBack: () => void; }

function ReviewField({ label, placeholder, value, onChange }: { label: string; placeholder: string; value: string; onChange: (value: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  function resize(element: HTMLTextAreaElement) { element.style.height = "auto"; element.style.height = `${Math.max(130, element.scrollHeight)}px`; }
  useEffect(() => { if (ref.current) resize(ref.current); }, [value]);
  function change(event: ChangeEvent<HTMLTextAreaElement>) { resize(event.currentTarget); onChange(event.target.value); }
  return <label><span>{label}</span><textarea ref={ref} placeholder={placeholder} value={value} onChange={change} /></label>;
}

export function SessionReviewForm({ review, advice, onSave, onBack }: Props) {
  const { text } = useLanguage();
  const [form, setForm] = useState(review);
  const [saved, setSaved] = useState(false);
  const [wantsAdvice, setWantsAdvice] = useState(false);
  function update<K extends keyof SessionReview>(key: K, value: SessionReview[K]) { setForm((current) => ({ ...current, [key]: value })); setSaved(false); }
  function save() { onSave({ findings: form.findings.trim(), problems: form.problems.trim(), nextChallenge: form.nextChallenge.trim(), ...(review.themeAchievement ? { themeAchievement: review.themeAchievement } : {}) }); setSaved(true); }
  return <section className="session-review"><header><div><p className="eyebrow">REVIEW</p><h3>{text("射撃後の振り返り", "Post-session review")}</h3></div>{saved && <span>{text("保存しました", "Saved")}</span>}</header><div className="review-fields"><ReviewField label={text("今日の気づき", "What you noticed")} placeholder={text("例：頬付けが自然に決まると初矢が安定した", "e.g. My first shot was stable when the mount felt natural")} value={form.findings} onChange={(value) => update("findings", value)} /><ReviewField label={text("うまくいかなかったこと", "What did not work")} placeholder={text("例：射台5で右方向のクレーを追いかけた", "e.g. I chased right targets from stand 5")} value={form.problems} onChange={(value) => update("problems", value)} /><ReviewField label={text("次回試すこと", "Next attempt")} placeholder={text("例：銃を急いで振らず、クレーを見てから動く", "e.g. See the target clearly before moving the gun")} value={form.nextChallenge} onChange={(value) => update("nextChallenge", value)} /></div>{!form.nextChallenge.trim() && <section className="review-advice"><label><input type="checkbox" checked={wantsAdvice} onChange={(event) => setWantsAdvice(event.target.checked)} /><span>{text("記録したスコアからアドバイスが欲しい", "Suggest a focus from my recorded scores")}</span></label>{wantsAdvice && (advice ? <div><p className="eyebrow">LOCAL ANALYSIS</p><strong>{advice.theme}</strong><p>{advice.reason}</p><button type="button" onClick={() => update("nextChallenge", advice.theme)}>{text("「次回試すこと」に採用", "Use as next attempt")}</button></div> : <p>{text("分析には50枚以上の入力が必要です。記録が増えると、射台・失中方向・初矢の傾向から提案します。", "Analysis needs at least 50 targets. With more records, suggestions use stand, miss direction, and first-shot trends.")}</p>)}</section>}<button className="primary-button" onClick={save}>{text("振り返りを保存", "Save review")}</button><button className="review-back-button" onClick={onBack}>{text("履歴へ戻る", "Back to history")}</button></section>;
}
