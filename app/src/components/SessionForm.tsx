import { useRef, useState, type FormEvent } from "react";
import type { Firearm } from "../domain/ammunition";
import type { SessionDetails } from "../domain/shooting";
import type { PracticeRecommendation } from "../services/sessionPlanning";
import { validateTemperatureInput } from "../services/temperatureInput";
import "./SessionForm.css";
import { useLanguage } from "../i18n/LanguageContext";

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

const weatherOptions = [{ value: "晴れ", en: "Sunny" }, { value: "薄曇り", en: "Partly cloudy" }, { value: "曇り", en: "Cloudy" }, { value: "小雨", en: "Light rain" }, { value: "雨", en: "Rain" }, { value: "雪", en: "Snow" }, { value: "霧", en: "Fog" }];
const windDirectionOptions = [
  { value: "向かい風", ja: "向かい風 ↓", en: "Headwind ↓" },
  { value: "追い風", ja: "追い風 ↑", en: "Tailwind ↑" },
  { value: "左から", ja: "左から →", en: "From left →" },
  { value: "右から", ja: "右から ←", en: "From right ←" },
  { value: "変化あり", ja: "変化あり ↕", en: "Variable ↕" },
];
const windStrengthOptions = [{ value: "ほぼ無風", en: "Calm" }, { value: "弱い", en: "Light" }, { value: "普通", en: "Moderate" }, { value: "強い", en: "Strong" }];

export function SessionForm({ onStart, onCancel, cancelLabel = "キャンセル", initialValue, title = "新しい射撃", kicker = "NEW SESSION", submitLabel = "セッション開始", rangeNames = [], ammunitionNames = [], firearms = [], practiceRecommendation = null }: Props) {
  const { language, text } = useLanguage();
  const displayTitle = title === "新しい射撃" ? text(title, "New shooting session") : title === "基本情報を編集" ? text(title, "Edit session details") : title;
  const displayCancelLabel = cancelLabel === "キャンセル" ? text(cancelLabel, "Cancel") : cancelLabel === "履歴へ戻る" ? text(cancelLabel, "Back to history") : cancelLabel;
  const displaySubmitLabel = submitLabel === "セッション開始" ? text(submitLabel, "Start session") : submitLabel === "変更を保存" ? text(submitLabel, "Save changes") : submitLabel;
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
    <header><p className="eyebrow">{kicker}</p><h2>{displayTitle}</h2></header>
    <form onSubmit={submit}>
      <label><span>{text("日付", "Date")}</span><input type="date" required value={form.date} onChange={(e) => update("date", e.target.value)} /></label>
      <label><span>{text("射撃場", "Shooting range")}</span>{newRange ? <div className="master-new"><input required placeholder={text("例：大井射撃場", "e.g. Oi Shooting Range")} value={form.rangeName} onChange={(e) => update("rangeName", e.target.value)} />{rangeNames.length > 0 && <button type="button" onClick={() => { setNewRange(false); update("rangeName", rangeNames[0] ?? ""); }}>{text("選択に戻る", "Back to list")}</button>}</div> : <select required value={form.rangeName} onChange={(e) => { if (e.target.value === "__new__") { setNewRange(true); update("rangeName", ""); } else update("rangeName", e.target.value); }}><option value="" disabled>{text("選択してください", "Select")}</option>{rangeNames.map((name) => <option key={name}>{name}</option>)}<option value="__new__">{text("＋ 新しい射撃場を登録", "+ Add shooting range")}</option></select>}</label>
      <label><span>{text("種目", "Discipline")}</span><select value={form.discipline} onChange={(e) => update("discipline", e.target.value as SessionDraft["discipline"])}><option value="trap">Trap — {text("対応済み", "Supported")}</option><option value="skeet">Skeet — {text("Preview準備中", "Preview coming")}</option>{form.discipline === "sporting" && <option value="sporting">Sporting — {text("既存記録", "Existing record")}</option>}</select><small>{text("現在のスコア入力・分析はTrap専用です。", "Score entry and analysis currently support Trap only.")}</small></label>
      <label><span>{text("実包", "Ammunition")}</span>{newAmmunition ? <div className="master-new"><input required placeholder="e.g. Fiocchi TT TWO" value={form.ammunitionName} onChange={(e) => update("ammunitionName", e.target.value)} />{ammunitionNames.length > 0 && <button type="button" onClick={() => { setNewAmmunition(false); update("ammunitionName", ammunitionNames[0] ?? ""); }}>{text("選択に戻る", "Back to list")}</button>}</div> : <select required value={form.ammunitionName} onChange={(e) => { if (e.target.value === "__new__") { setNewAmmunition(true); update("ammunitionName", ""); } else update("ammunitionName", e.target.value); }}><option value="" disabled>{text("選択してください", "Select")}</option>{ammunitionNames.map((name) => <option key={name}>{name}</option>)}<option value="__new__">{text("＋ 新しい実包を登録", "+ Add ammunition")}</option></select>}</label>
      <label><span>{text("使用銃", "Firearm")}</span><select value={form.firearmId ?? ""} onChange={(e) => update("firearmId", e.target.value)}><option value="">{text("未設定", "Not set")}</option>{firearms.map((firearm) => <option key={firearm.id} value={firearm.id}>{firearm.name}・{firearm.identifier}</option>)}</select></label>
      <label><span>{text("天候", "Weather")}</span><select value={form.weather} onChange={(e) => update("weather", e.target.value)}><option value="">{text("未選択", "Not selected")}</option>{weatherOptions.map((weather) => <option key={weather.value} value={weather.value}>{language === "ja" ? weather.value : weather.en}</option>)}{form.weather && !weatherOptions.some((item) => item.value === form.weather) && <option>{form.weather}</option>}</select></label>
      <label><span>気温</span><div className="temperature-input"><input inputMode="decimal" maxLength={6} placeholder="例：18" value={form.temperature ?? ""} onChange={(e) => { const value = validateTemperatureInput(e.target.value); if (value !== null) update("temperature", value); }} /><small>℃</small></div><small>半角数字で入力</small></label>
      <label><span>{text("風向", "Wind direction")}</span><select value={form.windDirection ?? ""} onChange={(e) => update("windDirection", e.target.value)}><option value="">{text("未選択", "Not selected")}</option>{windDirectionOptions.map((option) => <option key={option.value} value={option.value}>{option[language]}</option>)}</select></label>
      <label><span>{text("風の強さ", "Wind strength")}</span><select value={form.windStrength ?? ""} onChange={(e) => update("windStrength", e.target.value)}><option value="">{text("未選択", "Not selected")}</option>{windStrengthOptions.map((item) => <option key={item.value} value={item.value}>{language === "ja" ? item.value : item.en}</option>)}</select></label>
      {showRecommendation && practiceRecommendation && <section className="wide next-practice-navigator" aria-label="次回練習ナビ">
        <header><div><p className="eyebrow">NEXT PRACTICE</p><strong>次回練習ナビ</strong></div><span>おすすめ</span></header>
        <h3>{practiceRecommendation.theme}</h3>
        <p>{practiceRecommendation.reason}</p>
        <div><button type="button" className={recommendationAccepted ? "accepted" : ""} onClick={() => { update("practiceTheme", practiceRecommendation.theme); setRecommendationAccepted(true); }}>{recommendationAccepted ? "採用しました" : "このテーマを採用"}</button><button type="button" onClick={() => { update("practiceTheme", practiceRecommendation.theme); practiceThemeRef.current?.focus(); }}>編集して採用</button><button type="button" onClick={() => { if (form.practiceTheme === practiceRecommendation.theme) update("practiceTheme", ""); setShowRecommendation(false); }}>今回は使わない</button></div>
      </section>}
      <label className="wide practice-theme-field"><span>{text("今日の練習テーマ", "Practice focus")}</span><textarea ref={practiceThemeRef} rows={4} placeholder={text("例：銃を急いで振らず、クレーを見てから動く", "e.g. See the target clearly before moving the gun")} value={form.practiceTheme ?? ""} onChange={(e) => update("practiceTheme", e.target.value)} />{!initialValue && suggestedPracticeTheme && showRecommendation && <small>{text("提案は自由に編集できます。採用しなくても記録には影響しません。", "You can edit or ignore this suggestion without affecting your records.")}</small>}</label>
      <label className="wide"><span>{text("メモ", "Notes")}</span><textarea rows={3} placeholder={text("任意", "Optional")} value={form.memo} onChange={(e) => update("memo", e.target.value)} /></label>
      <div className="form-actions wide"><button className="form-cancel-button" type="button" onClick={onCancel}>{displayCancelLabel}</button><button className="primary-button" type="submit">{displaySubmitLabel}</button></div>
    </form>
  </section>;
}
