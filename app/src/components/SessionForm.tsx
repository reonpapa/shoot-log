import { useState, type FormEvent } from "react";
import type { SessionDetails } from "../domain/shooting";
import "./SessionForm.css";

export type SessionDraft = SessionDetails;
interface Props { onStart: (session: SessionDraft) => void; }
const today = () => new Date().toLocaleDateString("sv-SE");

export function SessionForm({ onStart }: Props) {
  const [form, setForm] = useState<SessionDraft>({ date: today(), rangeName: "", discipline: "trap", ammunitionName: "", weather: "", memo: "" });
  const update = <K extends keyof SessionDraft>(key: K, value: SessionDraft[K]) => setForm((current) => ({ ...current, [key]: value }));
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clean = { ...form, rangeName: form.rangeName.trim(), ammunitionName: form.ammunitionName.trim(), weather: form.weather.trim(), memo: form.memo.trim() };
    if (clean.rangeName && clean.ammunitionName) onStart(clean);
  }
  return <section className="session-form">
    <header><p className="eyebrow">NEW SESSION</p><h2>新しい射撃</h2></header>
    <form onSubmit={submit}>
      <label><span>日付</span><input type="date" required value={form.date} onChange={(e) => update("date", e.target.value)} /></label>
      <label><span>射撃場</span><input required placeholder="例：大井射撃場" value={form.rangeName} onChange={(e) => update("rangeName", e.target.value)} /></label>
      <label><span>種目</span><select value={form.discipline} onChange={(e) => update("discipline", e.target.value as SessionDraft["discipline"])}><option value="trap">Trap</option><option value="skeet">Skeet</option><option value="sporting">Sporting</option></select></label>
      <label><span>実包</span><input required placeholder="例：Fiocchi TT TWO" value={form.ammunitionName} onChange={(e) => update("ammunitionName", e.target.value)} /></label>
      <label><span>天候</span><input placeholder="任意" value={form.weather} onChange={(e) => update("weather", e.target.value)} /></label>
      <label className="wide"><span>メモ</span><textarea rows={3} placeholder="任意" value={form.memo} onChange={(e) => update("memo", e.target.value)} /></label>
      <button className="primary-button wide" type="submit">セッション開始</button>
    </form>
  </section>;
}
