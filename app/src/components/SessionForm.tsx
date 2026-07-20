import { useRef, useState, type FormEvent } from "react";
import type { Firearm } from "../domain/ammunition";
import type { SessionDetails } from "../domain/shooting";
import type { PracticeRecommendation } from "../services/sessionPlanning";
import "./SessionForm.css";

export type SessionDraft = SessionDetails;
interface Props {
  onStart: (session: SessionDraft) => void;
  initialValue?: SessionDraft;
  title?: string;
  kicker?: string;
  submitLabel?: string;
  rangeNames?: string[];
  ammunitionNames?: string[];
  firearms?: Firearm[];
  practiceRecommendation?: PracticeRecommendation | null;
  onCancel: () => void;
  cancelLabel?: string;
}
const today = () => new Date().toLocaleDateString("sv-SE");

const weatherOptions = ["晴れ", "薄曇り", "曇り", "小雨", "雨", "雪", "霧"];
const windDirectionOptions = ["向かい風", "追い風", "左から", "右から", "変化あり"];
const windStrengthOptions = ["ほぼ無風", "弱い", "普通", "強い"];

export function SessionForm({ onStart, onCancel, cancelLabel = "キャンセル", initialValue, title = "新しい射撃", kicker = "NEW SESSION", submitLabel = "セッション開始", rangeNames = [], ammunitionNames = [], firearms = [], practiceRecommendation = null }: Props) {
  const suggestedPracticeTheme = practiceRecommendation?.theme ?? "";
  const [form, setForm] = useState<SessionDraft>(initialValue ?? { date: today(), rangeName: "", discipline: "trap", ammunitionName: "", firearmId: firearms[0]?.id ?? "", practiceTheme: suggestedPracticeTheme, weather: "", temperature: "", windDirection: "", windStrength: "", memo: "" });
  const [showRecommendation, setShowRecommendation] = useState(!!practiceRecommendation && !initialValue);
  const [recommendationAccepted, setRecommendationAccepted] = useState(false);
  const [newRange, setNewRange] = useState(rangeNames.length === 0);
  const [newAmmunition, setNewAmmunition] = useState(ammunitionNames.length === 0);
  const practiceThemeRef = useRef<HTMLTextAreaElement>(null);
  const update = <K extends keyof SessionDraft>(key: K, value: SessionDraft[K]) => setForm((current) => ({ ...current, [key]: value }));
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clean = { ...form, rangeName: form.rangeName.trim(), ammunitionName: form.ammunitionName.trim(), practiceTheme: form.practiceTheme?.trim() ?? "", weather: form.weather.trim(), temperature: form.temperature?.trim() ?? "", windDirection: form.windDirection?.trim() ?? "", windStrength: form.windStrength?.trim() ?? "", memo: form.memo.trim() };
    if (clean.rangeName && clean.ammunitionName) onStart(clean);
  }
  return <section className="session-form">
    <header><p className="eyebrow">{kicker}</p><h2>{title}</h2></header>
    <form onSubmit={submit}>
      <label><span>日付</span><input type="date" required value={form.date} onChange={(e) => update("date", e.target.value)} /></label>
      <label><span>射撃場</span>{newRange ? <div className="master-new"><input required placeholder="例：大井射撃場" value={form.rangeName} onChange={(e) => update("rangeName", e.target.value)} />{rangeNames.length > 0 && <button type="button" onClick={() => { setNewRange(false); update("rangeName", rangeNames[0] ?? ""); }}>選択に戻る</button>}</div> : <select required value={form.rangeName} onChange={(e) => { if (e.target.value === "__new__") { setNewRange(true); update("rangeName", ""); } else update("rangeName", e.target.value); }}><option value="" disabled>選択してください</option>{rangeNames.map((name) => <option key={name}>{name}</option>)}<option value="__new__">＋ 新しい射撃場を登録</option></select>}</label>
      <label><span>種目</span><select value={form.discipline} onChange={(e) => update("discipline", e.target.value as SessionDraft["discipline"])}><option value="trap">Trap</option><option value="skeet">Skeet</option><option value="sporting">Sporting</option></select></label>
      <label><span>実包</span>{newAmmunition ? <div className="master-new"><input required placeholder="例：Fiocchi TT TWO" value={form.ammunitionName} onChange={(e) => update("ammunitionName", e.target.value)} />{ammunitionNames.length > 0 && <button type="button" onClick={() => { setNewAmmunition(false); update("ammunitionName", ammunitionNames[0] ?? ""); }}>選択に戻る</button>}</div> : <select required value={form.ammunitionName} onChange={(e) => { if (e.target.value === "__new__") { setNewAmmunition(true); update("ammunitionName", ""); } else update("ammunitionName", e.target.value); }}><option value="" disabled>選択してください</option>{ammunitionNames.map((name) => <option key={name}>{name}</option>)}<option value="__new__">＋ 新しい実包を登録</option></select>}</label>
      <label><span>使用銃</span><select value={form.firearmId ?? ""} onChange={(e) => update("firearmId", e.target.value)}><option value="">未設定</option>{firearms.map((firearm) => <option key={firearm.id} value={firearm.id}>{firearm.name}・{firearm.identifier}</option>)}</select></label>
      <label><span>天候</span><select value={form.weather} onChange={(e) => update("weather", e.target.value)}><option value="">未選択</option>{weatherOptions.map((weather) => <option key={weather}>{weather}</option>)}{form.weather && !weatherOptions.includes(form.weather) && <option>{form.weather}</option>}</select></label>
      <label><span>気温</span><div className="temperature-input"><input inputMode="decimal" placeholder="例：18" value={form.temperature ?? ""} onChange={(e) => update("temperature", e.target.value)} /><small>℃</small></div></label>
      <label><span>風向</span><select value={form.windDirection ?? ""} onChange={(e) => update("windDirection", e.target.value)}><option value="">未選択</option>{windDirectionOptions.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label><span>風の強さ</span><select value={form.windStrength ?? ""} onChange={(e) => update("windStrength", e.target.value)}><option value="">未選択</option>{windStrengthOptions.map((value) => <option key={value}>{value}</option>)}</select></label>
      {showRecommendation && practiceRecommendation && <section className="wide next-practice-navigator" aria-label="次回練習ナビ">
        <header><div><p className="eyebrow">NEXT PRACTICE</p><strong>次回練習ナビ</strong></div><span>おすすめ</span></header>
        <h3>{practiceRecommendation.theme}</h3>
        <p>{practiceRecommendation.reason}</p>
        <div><button type="button" className={recommendationAccepted ? "accepted" : ""} onClick={() => { update("practiceTheme", practiceRecommendation.theme); setRecommendationAccepted(true); }}>{recommendationAccepted ? "採用しました" : "このテーマを採用"}</button><button type="button" onClick={() => { update("practiceTheme", practiceRecommendation.theme); practiceThemeRef.current?.focus(); }}>編集して採用</button><button type="button" onClick={() => { if (form.practiceTheme === practiceRecommendation.theme) update("practiceTheme", ""); setShowRecommendation(false); }}>今回は使わない</button></div>
      </section>}
      <label className="wide practice-theme-field"><span>今日の練習テーマ</span><textarea ref={practiceThemeRef} rows={4} placeholder="例：銃を急いで振らず、クレーを見てから動く" value={form.practiceTheme ?? ""} onChange={(e) => update("practiceTheme", e.target.value)} />{!initialValue && suggestedPracticeTheme && showRecommendation && <small>提案は自由に編集できます。採用しなくても記録には影響しません。</small>}</label>
      <label className="wide"><span>メモ</span><textarea rows={3} placeholder="任意" value={form.memo} onChange={(e) => update("memo", e.target.value)} /></label>
      <div className="form-actions wide"><button className="form-cancel-button" type="button" onClick={onCancel}>{cancelLabel}</button><button className="primary-button" type="submit">{submitLabel}</button></div>
    </form>
  </section>;
}
