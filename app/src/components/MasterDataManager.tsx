import { useState } from "react";
import type { MasterData } from "../services/masterData";
import "./MasterDataManager.css";
import { useLanguage } from "../i18n/LanguageContext";

export type MasterKind = "range" | "ammunition";
interface Props { masterData: MasterData; onBack: () => void; onAdd: (kind: MasterKind, value: string) => void; onRename: (kind: MasterKind, oldValue: string, newValue: string) => void; onDelete: (kind: MasterKind, value: string) => void; }

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

export function MasterDataManager({ masterData, onBack, onAdd, onRename, onDelete }: Props) {
  const { text } = useLanguage();
  return <section className="master-manager"><header className="master-header"><div><p className="eyebrow">MASTER DATA</p><h2>{text("登録内容の管理", "Manage saved items")}</h2><p>{text("名称修正は過去の履歴にも反映されます。削除しても過去の履歴は残ります。", "Renaming also updates past history. Deleting an option does not remove past records.")}</p></div><button onClick={onBack}>{text("履歴へ戻る", "Back to history")}</button></header><div className="master-grid"><MasterGroup kind="range" title="射撃場" values={masterData.rangeNames} onAdd={onAdd} onRename={onRename} onDelete={onDelete} /><MasterGroup kind="ammunition" title="実包" values={masterData.ammunitionNames} onAdd={onAdd} onRename={onRename} onDelete={onDelete} /></div></section>;
}
