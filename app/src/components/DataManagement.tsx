import { useRef, useState, type ChangeEvent } from "react";
import { createBackup, downloadBackup, parseBackup, type ShootLogBackup } from "../services/backup";
import type { MasterData } from "../services/masterData";
import type { AmmunitionLedgerData } from "../domain/ammunition";
import type { StoredSession } from "../services/storage";
import "./DataManagement.css";

interface Props {
  sessions: StoredSession[];
  masterData: MasterData;
  ammunitionLedger: AmmunitionLedgerData;
  onBack: () => void;
  onImport: (backup: ShootLogBackup) => void;
}

export function DataManagement({ sessions, masterData, ammunitionLedger, onBack, onImport }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  function exportData() { downloadBackup(createBackup(sessions, masterData, ammunitionLedger)); setMessage(`${sessions.length}件のセッションと実包台帳を書き出しました。`); }
  async function importData(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const backup = parseBackup(await file.text());
      if (!window.confirm(`${backup.sessions.length}件のセッションを現在のデータへ統合しますか？\n現在のデータは削除されません。`)) return;
      onImport(backup);
      setMessage(`${backup.sessions.length}件のバックアップを読み込みました。`);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "バックアップを読み込めませんでした。");
    }
  }
  return <section className="data-management"><header><div><p className="eyebrow">DATA BACKUP</p><h2>バックアップ</h2><p>端末内の全データをJSONファイルとして保存・復元します。</p></div><button onClick={onBack}>履歴へ戻る</button></header><div className="data-panels"><article className="local-data-panel"><span>BACKUP</span><h3>バックアップを書き出す</h3><p>現在の全データをJSONファイルとしてMacへ保存します。</p><strong>{sessions.length}<small> セッション</small></strong><button className="primary-button" onClick={exportData}>バックアップを保存</button></article><article className="local-data-panel"><span>RESTORE</span><h3>バックアップを読み込む</h3><p>既存データを残したまま、バックアップの内容を統合します。</p><strong>JSON<small> ファイル</small></strong><input ref={fileInput} hidden accept="application/json,.json" type="file" onChange={importData} /><button onClick={() => fileInput.current?.click()}>ファイルを選択</button></article></div>{message && <p className="data-message">{message}</p>}<aside><strong>クラウド同期とは独立したバックアップ</strong><p>アカウント設定のクラウド同期に加えて、定期的にJSONバックアップを保存してください。</p></aside></section>;
}
