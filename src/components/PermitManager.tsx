import { useState, type FormEvent } from "react";
import type { AmmunitionLedgerData, Firearm } from "../domain/ammunition";
import { getPermitStatus } from "../domain/permit";
import "./PermitManager.css";
import { useLanguage } from "../i18n/LanguageContext";

interface Props { data: AmmunitionLedgerData; onChange: (data: AmmunitionLedgerData) => void; onBack: () => void; backLabel?: string; }

const emptyFirearm = (language: "ja" | "en"): Firearm => ({ id: "", name: "", identifier: "", originalPermitDate: "", originalPermitNumber: "", permitDate: "", permitNumber: "", inspectionDate: "", validUntil: "", renewalStartDate: "", renewalDeadline: "", kind: language === "ja" ? "散弾銃" : "Shotgun", actionType: "", manufacturer: "", model: "", overallLength: "", barrelLength: "", caliber: "", magazine: "", compatibleAmmo: "", purpose: language === "ja" ? "標的射撃" : "Target shooting" });

interface FieldProps { label: string; field: keyof Firearm; draft: Firearm; type?: string; placeholder?: string; onChange: (field: keyof Firearm, value: string) => void; }
function Field({ label, field, draft, type = "text", placeholder = "", onChange }: FieldProps) {
  return <label><span>{label}</span><input placeholder={placeholder} type={type} value={String(draft[field] ?? "")} onChange={(event) => onChange(field, event.target.value)} /></label>;
}

export function PermitManager({ data, onChange, onBack, backLabel = "履歴へ戻る" }: Props) {
  const { language, text } = useLanguage();
  const [selectedId, setSelectedId] = useState(data.firearms[0]?.id ?? "new");
  const [profileDraft, setProfileDraft] = useState(data.permitProfile);
  const selected = data.firearms.find((item) => item.id === selectedId);
  const [draft, setDraft] = useState<Firearm>(selected ? { ...selected } : emptyFirearm(language));
  const updateDraft = (field: keyof Firearm, value: string) => setDraft((current) => ({ ...current, [field]: value }));

  function select(id: string) { setSelectedId(id); const found = data.firearms.find((item) => item.id === id); setDraft(found ? { ...found } : emptyFirearm(language)); }
  function save(event: FormEvent) {
    event.preventDefault();
    const clean = Object.fromEntries(Object.entries(draft).map(([key, value]) => [key, typeof value === "string" ? value.trim() : value])) as unknown as Firearm;
    if (!clean.name || !clean.identifier) return;
    if (clean.renewalStartDate && clean.renewalDeadline && clean.renewalStartDate > clean.renewalDeadline) { window.alert(text("更新申請期間の開始日と期限を確認してください。", "Check the renewal application start date and deadline.")); return; }
    if (clean.renewalDeadline && clean.validUntil && clean.renewalDeadline > clean.validUntil) { window.alert(text("更新申請期限と有効期限を確認してください。", "Check the renewal deadline and permit expiry date.")); return; }
    const saved = { ...clean, id: clean.id || crypto.randomUUID() };
    onChange({ ...data, firearms: clean.id ? data.firearms.map((item) => item.id === clean.id ? saved : item) : [...data.firearms, saved] });
    setSelectedId(saved.id); setDraft(saved);
  }
  function remove() {
    if (!draft.id || !window.confirm(text(`${draft.name}を削除しますか？\n射撃履歴に登録された使用銃表示にも影響します。`, `Delete ${draft.name}?\nThis also affects firearm labels in shooting history.`))) return;
    const next = data.firearms.filter((item) => item.id !== draft.id); onChange({ ...data, firearms: next }); select(next[0]?.id ?? "new");
  }
  function updateProfile(field: keyof AmmunitionLedgerData["permitProfile"], value: string) { setProfileDraft((current) => ({ ...current, [field]: value })); }
  function saveProfile() { onChange({ ...data, permitProfile: { certificateNumber: profileDraft.certificateNumber.trim(), originalIssueDate: profileDraft.originalIssueDate, issueDate: profileDraft.issueDate } }); }

  return <section className="permit-manager">
    <header><div><p className="eyebrow">FIREARM PERMIT</p><h2>{text("所持許可・更新管理", "Firearm permit & renewal")}</h2><p>{text("許可証に記載された更新申請期限を最優先で管理します。", "Prioritizes the renewal application deadline printed on your permit.")}</p></div><button onClick={onBack}>{backLabel === "履歴へ戻る" ? text(backLabel, "Back to history") : backLabel}</button></header>
    <section className="permit-profile"><header><h3>{text("許可証共通情報", "Permit details")}</h3><span>{text("氏名・住所・生年月日は保存しません", "Name, address, and birth date are not stored")}</span></header><div className="permit-fields important"><label><span>{text("許可証番号", "Permit number")}</span><input value={profileDraft.certificateNumber} onChange={(event) => updateProfile("certificateNumber", event.target.value)} /></label><label><span>{text("原交付日", "Original issue date")}</span><input type="date" value={profileDraft.originalIssueDate} onChange={(event) => updateProfile("originalIssueDate", event.target.value)} /></label><label><span>{text("交付日", "Issue date")}</span><input type="date" value={profileDraft.issueDate} onChange={(event) => updateProfile("issueDate", event.target.value)} /></label></div><button className="profile-save" type="button" onClick={saveProfile}>{text("共通情報を保存", "Save permit details")}</button></section>
    <div className="permit-layout"><aside><button className={selectedId === "new" ? "selected" : ""} onClick={() => select("new")}>{text("＋ 銃を追加", "+ Add firearm")}</button>{data.firearms.map((firearm) => { const status = getPermitStatus(firearm); return <button className={selectedId === firearm.id ? "selected" : ""} key={firearm.id} onClick={() => select(firearm.id)}><strong>{firearm.name}</strong><span>{firearm.identifier}</span><small className={status.level}>{status.label}</small></button>; })}</aside>
      <form onSubmit={save}>
        <section><header><h3>{text("更新日程", "Renewal schedule")}</h3><span>{text("許可証の記載どおり入力", "Enter exactly as printed on the permit")}</span></header><div className="permit-fields important"><Field draft={draft} field="validUntil" label={text("有効期限", "Valid until")} type="date" onChange={updateDraft} /><Field draft={draft} field="renewalStartDate" label={text("更新申請開始日", "Application start date")} type="date" onChange={updateDraft} /><Field draft={draft} field="renewalDeadline" label={text("更新申請期限", "Application deadline")} type="date" onChange={updateDraft} /></div></section>
        <section><header><h3>{text("許可情報", "Authorization details")}</h3></header><div className="permit-fields"><Field draft={draft} field="originalPermitDate" label={text("原許可年月日", "Original authorization date")} type="date" onChange={updateDraft} /><Field draft={draft} field="originalPermitNumber" label={text("原許可番号", "Original authorization number")} onChange={updateDraft} /><Field draft={draft} field="permitDate" label={text("許可年月日", "Authorization date")} type="date" onChange={updateDraft} /><Field draft={draft} field="permitNumber" label={text("許可番号", "Authorization number")} onChange={updateDraft} /><Field draft={draft} field="inspectionDate" label={text("確認年月日", "Inspection date")} type="date" onChange={updateDraft} /></div></section>
        <section><header><h3>{text("銃の登録内容", "Firearm details")}</h3></header><div className="permit-fields"><Field draft={draft} field="name" label={text("表示名", "Display name")} placeholder={text("例：ミロク Trap AC", "e.g. Miroku Trap AC")} onChange={updateDraft} /><Field draft={draft} field="identifier" label={text("銃番号", "Serial number")} onChange={updateDraft} /><Field draft={draft} field="kind" label={text("種類", "Type")} onChange={updateDraft} /><Field draft={draft} field="actionType" label={text("型式", "Action type")} onChange={updateDraft} /><Field draft={draft} field="manufacturer" label={text("メーカー名", "Manufacturer")} onChange={updateDraft} /><Field draft={draft} field="model" label={text("モデル名等", "Model") } onChange={updateDraft} /><Field draft={draft} field="overallLength" label={text("銃の全長", "Overall length")} placeholder="cm" onChange={updateDraft} /><Field draft={draft} field="barrelLength" label={text("銃身長", "Barrel length")} placeholder="cm" onChange={updateDraft} /><Field draft={draft} field="caliber" label={text("口径", "Gauge / caliber")} onChange={updateDraft} /><Field draft={draft} field="magazine" label={text("弾倉形式・装弾数", "Magazine type / capacity")} onChange={updateDraft} /><Field draft={draft} field="compatibleAmmo" label={text("適合実包", "Compatible ammunition")} onChange={updateDraft} /><Field draft={draft} field="purpose" label={text("用途", "Purpose")} onChange={updateDraft} /></div></section>
        <div className="permit-actions">{draft.id && <button className="delete" type="button" onClick={remove}>{text("この銃を削除", "Delete this firearm")}</button>}<button type="button" onClick={onBack}>{text("キャンセル", "Cancel")}</button><button className="primary-button" type="submit">{text("登録内容を保存", "Save details")}</button></div>
      </form></div>
  </section>;
}
