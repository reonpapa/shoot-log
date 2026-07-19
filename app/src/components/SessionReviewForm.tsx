import { useEffect, useRef, useState, type ChangeEvent } from "react";
import type { SessionReview } from "../domain/shooting";
import "./SessionReviewForm.css";

interface Props { review: SessionReview; onSave: (review: SessionReview) => void; onBack: () => void; }

function ReviewField({ label, placeholder, value, onChange }: { label: string; placeholder: string; value: string; onChange: (value: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  function resize(element: HTMLTextAreaElement) { element.style.height = "auto"; element.style.height = `${Math.max(130, element.scrollHeight)}px`; }
  useEffect(() => { if (ref.current) resize(ref.current); }, [value]);
  function change(event: ChangeEvent<HTMLTextAreaElement>) { resize(event.currentTarget); onChange(event.target.value); }
  return <label><span>{label}</span><textarea ref={ref} placeholder={placeholder} value={value} onChange={change} /></label>;
}

export function SessionReviewForm({ review, onSave, onBack }: Props) {
  const [form, setForm] = useState(review);
  const [saved, setSaved] = useState(false);
  function update<K extends keyof SessionReview>(key: K, value: SessionReview[K]) { setForm((current) => ({ ...current, [key]: value })); setSaved(false); }
  function save() { onSave({ findings: form.findings.trim(), problems: form.problems.trim(), nextChallenge: form.nextChallenge.trim(), ...(review.themeAchievement ? { themeAchievement: review.themeAchievement } : {}) }); setSaved(true); }
  return <section className="session-review"><header><div><p className="eyebrow">REVIEW</p><h3>射撃後の振り返り</h3></div>{saved && <span>保存しました</span>}</header><div className="review-fields"><ReviewField label="今日の気づき" placeholder="例：頬付けが自然に決まると初矢が安定した" value={form.findings} onChange={(value) => update("findings", value)} /><ReviewField label="うまくいかなかったこと" placeholder="例：射台5で右方向のクレーを追いかけた" value={form.problems} onChange={(value) => update("problems", value)} /><ReviewField label="次回試すこと" placeholder="例：銃を急いで振らず、クレーを見てから動く" value={form.nextChallenge} onChange={(value) => update("nextChallenge", value)} /></div><button className="primary-button" onClick={save}>振り返りを保存</button><button className="review-back-button" onClick={onBack}>履歴へ戻る</button></section>;
}
