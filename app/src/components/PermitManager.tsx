import { useState, type FormEvent } from "react";
import type { AmmunitionLedgerData, Firearm } from "../domain/ammunition";
import { getPermitStatus } from "../domain/permit";
import "./PermitManager.css";

interface Props { data: AmmunitionLedgerData; onChange: (data: AmmunitionLedgerData) => void; onBack: () => void; backLabel?: string; }

const emptyFirearm = (): Firearm => ({ id: "", name: "", identifier: "", originalPermitDate: "", originalPermitNumber: "", permitDate: "", permitNumber: "", inspectionDate: "", validUntil: "", renewalStartDate: "", renewalDeadline: "", kind: "散弾銃", actionType: "", manufacturer: "", model: "", overallLength: "", barrelLength: "", caliber: "", magazine: "", compatibleAmmo: "", purpose: "標的射撃" });

interface FieldProps { label: string; field: keyof Firearm; draft: Firearm; type?: string; placeholder?: string; onChange: (field: keyof Firearm, value: string) => void; }
function Field({ label, field, draft, type = "text", placeholder = "", onChange }: FieldProps) {
  return <label><span>{label}</span><input placeholder={placeholder} type={type} value={String(draft[field] ?? "")} onChange={(event) => onChange(field, event.target.value)} /></label>;
}

export function PermitManager({ data, onChange, onBack, backLabel = "履歴へ戻る" }: Props) {
  const [selectedId, setSelectedId] = useState(data.firearms[0]?.id ?? "new");
  const [profileDraft, setProfileDraft] = useState(data.permitProfile);
  const selected = data.firearms.find((item) => item.id === selectedId);
  const [draft, setDraft] = useState<Firearm>(selected ? { ...selected } : emptyFirearm());
  const updateDraft = (field: keyof Firearm, value: string) => setDraft((current) => ({ ...current, [field]: value }));

  function select(id: string) { setSelectedId(id); const found = data.firearms.find((item) => item.id === id); setDraft(found ? { ...found } : emptyFirearm()); }
  function save(event: FormEvent) {
    event.preventDefault();
    const clean = Object.fromEntries(Object.entries(draft).map(([key, value]) => [key, typeof value === "string" ? value.trim() : value])) as unknown as Firearm;
    if (!clean.name || !clean.identifier) return;
    if (clean.renewalStartDate && clean.renewalDeadline && clean.renewalStartDate > clean.renewalDeadline) { window.alert("更新申請期間の開始日と期限を確認してください。"); return; }
    if (clean.renewalDeadline && clean.validUntil && clean.renewalDeadline > clean.validUntil) { window.alert("更新申請期限と有効期限を確認してください。"); return; }
    const saved = { ...clean, id: clean.id || crypto.randomUUID() };
    onChange({ ...data, firearms: clean.id ? data.firearms.map((item) => item.id === clean.id ? saved : item) : [...data.firearms, saved] });
    setSelectedId(saved.id); setDraft(saved);
  }
  function remove() {
    if (!draft.id || !window.confirm(`${draft.name}を削除しますか？\n射撃履歴に登録された使用銃表示にも影響します。`)) return;
    const next = data.firearms.filter((item) => item.id !== draft.id); onChange({ ...data, firearms: next }); select(next[0]?.id ?? "new");
  }
  function updateProfile(field: keyof AmmunitionLedgerData["permitProfile"], value: string) { setProfileDraft((current) => ({ ...current, [field]: value })); }
  function saveProfile() { onChange({ ...data, permitProfile: { certificateNumber: profileDraft.certificateNumber.trim(), originalIssueDate: profileDraft.originalIssueDate, issueDate: profileDraft.issueDate } }); }

  return <section className="permit-manager">
    <header><div><p className="eyebrow">FIREARM PERMIT</p><h2>所持許可・更新管理</h2><p>許可証に記載された更新申請期限を最優先で管理します。</p></div><button onClick={onBack}>{backLabel}</button></header>
    <section className="permit-profile"><header><h3>許可証共通情報</h3><span>氏名・住所・生年月日は保存しません</span></header><div className="permit-fields important"><label><span>許可証番号</span><input value={profileDraft.certificateNumber} onChange={(event) => updateProfile("certificateNumber", event.target.value)} /></label><label><span>原交付日</span><input type="date" value={profileDraft.originalIssueDate} onChange={(event) => updateProfile("originalIssueDate", event.target.value)} /></label><label><span>交付日</span><input type="date" value={profileDraft.issueDate} onChange={(event) => updateProfile("issueDate", event.target.value)} /></label></div><button className="profile-save" type="button" onClick={saveProfile}>共通情報を保存</button></section>
    <div className="permit-layout"><aside><button className={selectedId === "new" ? "selected" : ""} onClick={() => select("new")}>＋ 銃を追加</button>{data.firearms.map((firearm) => { const status = getPermitStatus(firearm); return <button className={selectedId === firearm.id ? "selected" : ""} key={firearm.id} onClick={() => select(firearm.id)}><strong>{firearm.name}</strong><span>{firearm.identifier}</span><small className={status.level}>{status.label}</small></button>; })}</aside>
      <form onSubmit={save}>
        <section><header><h3>更新日程</h3><span>許可証の記載どおり入力</span></header><div className="permit-fields important"><Field draft={draft} field="validUntil" label="有効期限" type="date" onChange={updateDraft} /><Field draft={draft} field="renewalStartDate" label="更新申請開始日" type="date" onChange={updateDraft} /><Field draft={draft} field="renewalDeadline" label="更新申請期限" type="date" onChange={updateDraft} /></div></section>
        <section><header><h3>許可情報</h3></header><div className="permit-fields"><Field draft={draft} field="originalPermitDate" label="原許可年月日" type="date" onChange={updateDraft} /><Field draft={draft} field="originalPermitNumber" label="原許可番号" onChange={updateDraft} /><Field draft={draft} field="permitDate" label="許可年月日" type="date" onChange={updateDraft} /><Field draft={draft} field="permitNumber" label="許可番号" onChange={updateDraft} /><Field draft={draft} field="inspectionDate" label="確認年月日" type="date" onChange={updateDraft} /></div></section>
        <section><header><h3>銃の登録内容</h3></header><div className="permit-fields"><Field draft={draft} field="name" label="表示名" placeholder="例：ミロク Trap AC" onChange={updateDraft} /><Field draft={draft} field="identifier" label="銃番号" onChange={updateDraft} /><Field draft={draft} field="kind" label="種類" onChange={updateDraft} /><Field draft={draft} field="actionType" label="型式" onChange={updateDraft} /><Field draft={draft} field="manufacturer" label="メーカー名" onChange={updateDraft} /><Field draft={draft} field="model" label="モデル名等" onChange={updateDraft} /><Field draft={draft} field="overallLength" label="銃の全長" placeholder="cm" onChange={updateDraft} /><Field draft={draft} field="barrelLength" label="銃身長" placeholder="cm" onChange={updateDraft} /><Field draft={draft} field="caliber" label="口径" onChange={updateDraft} /><Field draft={draft} field="magazine" label="弾倉形式・装弾数" onChange={updateDraft} /><Field draft={draft} field="compatibleAmmo" label="適合実包" onChange={updateDraft} /><Field draft={draft} field="purpose" label="用途" onChange={updateDraft} /></div></section>
        <div className="permit-actions">{draft.id && <button className="delete" type="button" onClick={remove}>この銃を削除</button>}<button type="button" onClick={onBack}>キャンセル</button><button className="primary-button" type="submit">登録内容を保存</button></div>
      </form></div>
  </section>;
}
