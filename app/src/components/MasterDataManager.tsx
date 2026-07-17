import { useState } from "react";
import type { MasterData } from "../services/masterData";
import "./MasterDataManager.css";

export type MasterKind = "range" | "ammunition";
interface Props { masterData: MasterData; onBack: () => void; onAdd: (kind: MasterKind, value: string) => void; onRename: (kind: MasterKind, oldValue: string, newValue: string) => void; onDelete: (kind: MasterKind, value: string) => void; }

function MasterItem({ kind, value, onRename, onDelete }: { kind: MasterKind; value: string; onRename: Props["onRename"]; onDelete: Props["onDelete"] }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  function save() {
    const next = draft.trim();
    if (!next) return;
    onRename(kind, value, next);
    setEditing(false);
  }
  return <li>{editing ? <><input autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") save(); if (event.key === "Escape") { setDraft(value); setEditing(false); } }} /><button className="master-save" onClick={save}>保存</button><button onClick={() => { setDraft(value); setEditing(false); }}>取消</button></> : <><strong>{value}</strong><button onClick={() => setEditing(true)}>名称修正</button><button className="master-delete" onClick={() => onDelete(kind, value)}>削除</button></>}</li>;
}

function MasterGroup({ kind, title, values, onAdd, onRename, onDelete }: { kind: MasterKind; title: string; values: string[]; onAdd: Props["onAdd"]; onRename: Props["onRename"]; onDelete: Props["onDelete"] }) {
  const [newValue, setNewValue] = useState("");
  function add() { const value = newValue.trim(); if (!value) return; onAdd(kind, value); setNewValue(""); }
  return <section className="master-group"><header><h3>{title}</h3><span>{values.length}件</span></header><div className="master-add"><input placeholder={`新しい${title}を登録`} value={newValue} onChange={(event) => setNewValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") add(); }} /><button onClick={add}>＋ 登録</button></div>{values.length ? <ul>{values.map((value) => <MasterItem kind={kind} key={value} value={value} onRename={onRename} onDelete={onDelete} />)}</ul> : <p className="master-empty">登録がありません。</p>}</section>;
}

export function MasterDataManager({ masterData, onBack, onAdd, onRename, onDelete }: Props) {
  return <section className="master-manager"><header className="master-header"><div><p className="eyebrow">MASTER DATA</p><h2>登録内容の管理</h2><p>名称修正は過去の履歴にも反映されます。削除しても過去の履歴は残ります。</p></div><button onClick={onBack}>履歴へ戻る</button></header><div className="master-grid"><MasterGroup kind="range" title="射撃場" values={masterData.rangeNames} onAdd={onAdd} onRename={onRename} onDelete={onDelete} /><MasterGroup kind="ammunition" title="実包" values={masterData.ammunitionNames} onAdd={onAdd} onRename={onRename} onDelete={onDelete} /></div></section>;
}
