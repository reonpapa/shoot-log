import { useState } from "react";
import type { MasterData, RangeFace, TrapSet } from "../services/masterData";
import "./MasterDataManager.css";
import { useLanguage } from "../i18n/LanguageContext";

export type MasterKind = "range" | "ammunition";
interface Props { masterData: MasterData; onBack: () => void; onAdd: (kind: MasterKind, value: string) => void; onRename: (kind: MasterKind, oldValue: string, newValue: string) => void; onDelete: (kind: MasterKind, value: string) => void; onSaveRangeFace: (face: RangeFace) => void; onDeleteRangeFace: (id: string) => void; onSaveTrapSet: (set: TrapSet) => void; onDeleteTrapSet: (id: string) => void; }

function MasterItem({ kind, value, onRename, onDelete }: { kind: MasterKind; value: string; onRename: Props["onRename"]; onDelete: Props["onDelete"] }) {
  const { text } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  function save() {
    const next = draft.trim();
    if (!next) return;
    onRename(kind, value, next);
    setEditing(false);
  }
  return <li>{editing ? <><input autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") save(); if (event.key === "Escape") { setDraft(value); setEditing(false); } }} /><button className="master-save" onClick={save}>{text("保存", "Save")}</button><button onClick={() => { setDraft(value); setEditing(false); }}>{text("取消", "Cancel")}</button></> : <><strong>{value}</strong><button onClick={() => setEditing(true)}>{text("名称修正", "Rename")}</button><button className="master-delete" onClick={() => onDelete(kind, value)}>{text("削除", "Delete")}</button></>}</li>;
}

function MasterGroup({ kind, title, values, onAdd, onRename, onDelete }: { kind: MasterKind; title: string; values: string[]; onAdd: Props["onAdd"]; onRename: Props["onRename"]; onDelete: Props["onDelete"] }) {
  const { text } = useLanguage();
  const [newValue, setNewValue] = useState("");
  function add() { const value = newValue.trim(); if (!value) return; onAdd(kind, value); setNewValue(""); }
  const displayTitle = kind === "range" ? text("射撃場", "Shooting ranges") : text("実包", "Ammunition");
  return <section className="master-group"><header><h3>{displayTitle}</h3><span>{text(`${values.length}件`, `${values.length} items`)}</span></header><div className="master-add"><input placeholder={text(`新しい${title}を登録`, `Add new ${kind === "range" ? "shooting range" : "ammunition"}`)} value={newValue} onChange={(event) => setNewValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") add(); }} /><button onClick={add}>{text("＋ 登録", "+ Add")}</button></div>{values.length ? <ul>{values.map((value) => <MasterItem kind={kind} key={value} value={value} onRename={onRename} onDelete={onDelete} />)}</ul> : <p className="master-empty">{text("登録がありません。", "No saved items.")}</p>}</section>;
}

export function MasterDataManager({ masterData, onBack, onAdd, onRename, onDelete, onSaveRangeFace, onDeleteRangeFace, onSaveTrapSet, onDeleteTrapSet }: Props) {
  const { text } = useLanguage();
  return <section className="master-manager"><header className="master-header"><div><p className="eyebrow">MASTER DATA</p><h2>{text("登録内容の管理", "Manage saved items")}</h2><p>{text("射面候補の変更は今後の選択に反映され、過去ラウンドに保存済みの設定は変わりません。", "Target-setting changes affect future selections. Saved settings in past rounds remain unchanged.")}</p></div><button onClick={onBack}>{text("履歴へ戻る", "Back to history")}</button></header><div className="master-grid"><MasterGroup kind="range" title="射撃場" values={masterData.rangeNames} onAdd={onAdd} onRename={onRename} onDelete={onDelete} /><MasterGroup kind="ammunition" title="実包" values={masterData.ammunitionNames} onAdd={onAdd} onRename={onRename} onDelete={onDelete} /></div><RangeFaceMaster faces={masterData.rangeFaces} rangeNames={masterData.rangeNames} onSave={onSaveRangeFace} onDelete={onDeleteRangeFace} /><TrapSetMaster sets={masterData.trapSets} onSave={onSaveTrapSet} onDelete={onDeleteTrapSet} /></section>;
}

function RangeFaceMaster({ faces, rangeNames, onSave, onDelete }: { faces: RangeFace[]; rangeNames: string[]; onSave: Props["onSaveRangeFace"]; onDelete: Props["onDeleteRangeFace"] }) {
  const { text } = useLanguage();
  const empty = (): RangeFace => ({ id: crypto.randomUUID(), rangeName: rangeNames[0] ?? "", face: "" });
  const [draft, setDraft] = useState<RangeFace>(empty);
  const update = <K extends keyof RangeFace>(key: K, value: RangeFace[K]) => setDraft((current) => ({ ...current, [key]: value }));
  function save() { if (!draft.rangeName.trim() || !draft.face.trim()) return; onSave({ ...draft, rangeName: draft.rangeName.trim(), face: draft.face.trim() }); setDraft(empty()); }
  return <section className="trap-setting-master">
    <header><div><p className="eyebrow">FIELDS</p><h3>{text("射撃場ごとの射面", "Fields by range")}</h3></div><span>{text(`${faces.length}件`, `${faces.length} items`)}</span></header>
    <p className="master-note">{text("射面は「第1面」などの面そのものです。セットは別に登録し、ラウンド入力でそれぞれ選びます。", "A field is the physical layout (e.g. Field 1). Sets are registered separately and both are chosen per round.")}</p>
    <div className="trap-setting-editor">
      <label><span>{text("射撃場", "Range")}</span><select value={draft.rangeName} onChange={(event) => update("rangeName", event.target.value)}><option value="">{text("選択", "Select")}</option>{rangeNames.map((name) => <option key={name}>{name}</option>)}</select></label>
      <label><span>{text("射面", "Field")}</span><input placeholder={text("例：第1面", "e.g. Field 1")} value={draft.face} onChange={(event) => update("face", event.target.value)} /></label>
      <label className="wide"><span>{text("補足", "Note")}</span><input value={draft.note ?? ""} onChange={(event) => update("note", event.target.value)} /></label>
      <div className="trap-setting-editor-actions"><button onClick={() => setDraft(empty())}>{text("新規入力", "New")}</button><button className="master-save" onClick={save}>{text("保存", "Save")}</button></div>
    </div>
    <ul>{faces.map((item) => <li key={item.id}><div><strong>{item.rangeName}</strong><span>{item.face}{item.note ? `・${item.note}` : ""}</span></div><button onClick={() => setDraft(item)}>{text("編集", "Edit")}</button><button className="master-delete" onClick={() => { if (window.confirm(text("この射面を削除しますか？過去記録は変わりません。", "Delete this field? Past records will remain unchanged."))) onDelete(item.id); }}>{text("削除", "Delete")}</button></li>)}</ul>
  </section>;
}

function TrapSetMaster({ sets, onSave, onDelete }: { sets: TrapSet[]; onSave: Props["onSaveTrapSet"]; onDelete: Props["onDeleteTrapSet"] }) {
  const { text } = useLanguage();
  const empty = (): TrapSet => ({ id: crypto.randomUUID(), name: "" });
  const [draft, setDraft] = useState<TrapSet>(empty);
  const update = <K extends keyof TrapSet>(key: K, value: TrapSet[K]) => setDraft((current) => ({ ...current, [key]: value }));
  function save() { if (!draft.name.trim()) return; onSave({ ...draft, name: draft.name.trim() }); setDraft(empty()); }
  return <section className="trap-setting-master">
    <header><div><p className="eyebrow">TARGET SETS</p><h3>{text("クレーのセット", "Target sets")}</h3></div><span>{text(`${sets.length}件`, `${sets.length} items`)}</span></header>
    <p className="master-note">{text("セットは射撃場をまたいで共通です。ラウンドで選ぶと飛行距離と速度が自動で入ります。", "Sets are shared across ranges. Selecting one in a round fills in distance and speed.")}</p>
    <div className="trap-setting-editor">
      <label><span>{text("セット名", "Set name")}</span><input placeholder={text("例：ISSF国際セット", "e.g. ISSF set")} value={draft.name} onChange={(event) => update("name", event.target.value)} /></label>
      <label><span>{text("距離 m", "Distance m")}</span><input type="number" min="0" value={draft.distanceMeters ?? ""} onChange={(event) => update("distanceMeters", event.target.value ? Number(event.target.value) : undefined)} /></label>
      <label><span>{text("速度 km/h", "Speed km/h")}</span><input type="number" min="0" value={draft.speedKmh ?? ""} onChange={(event) => update("speedKmh", event.target.value ? Number(event.target.value) : undefined)} /></label>
      <label><span>{text("確認日", "Confirmed")}</span><input type="date" value={draft.confirmedOn ?? ""} onChange={(event) => update("confirmedOn", event.target.value)} /></label>
      <label className="wide"><span>{text("補足", "Note")}</span><input value={draft.note ?? ""} onChange={(event) => update("note", event.target.value)} /></label>
      <div className="trap-setting-editor-actions"><button onClick={() => setDraft(empty())}>{text("新規入力", "New")}</button><button className="master-save" onClick={save}>{text("保存", "Save")}</button></div>
    </div>
    <ul>{sets.map((item) => <li key={item.id}><div><strong>{item.name}</strong><span>{[item.distanceMeters ? `${item.distanceMeters}m` : "", item.speedKmh ? `${item.speedKmh}km/h` : "", item.confirmedOn ?? ""].filter(Boolean).join("・") || text("数値未設定", "No values")}</span></div><button onClick={() => setDraft(item)}>{text("編集", "Edit")}</button><button className="master-delete" onClick={() => { if (window.confirm(text("このセットを削除しますか？過去記録は変わりません。", "Delete this set? Past records will remain unchanged."))) onDelete(item.id); }}>{text("削除", "Delete")}</button></li>)}</ul>
  </section>;
}
