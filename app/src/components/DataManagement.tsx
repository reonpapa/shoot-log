import { useRef, useState, type ChangeEvent } from "react";
import { createBackup, downloadBackup, parseBackup, type ShootLogBackup } from "../services/backup";
import type { MasterData } from "../services/masterData";
import type { AmmunitionLedgerData } from "../domain/ammunition";
import type { StoredSession } from "../services/storage";
import "./DataManagement.css";
import { useLanguage } from "../i18n/LanguageContext";

interface Props {
  sessions: StoredSession[];
  masterData: MasterData;
  ammunitionLedger: AmmunitionLedgerData;
  onBack: () => void;
  onImport: (backup: ShootLogBackup) => void;
}

export function DataManagement({ sessions, masterData, ammunitionLedger, onBack, onImport }: Props) {
  const { text } = useLanguage();
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  function exportData() { downloadBackup(createBackup(sessions, masterData, ammunitionLedger)); setMessage(text(`${sessions.length}件のセッションと実包台帳を書き出しました。`, `Exported ${sessions.length} sessions and the ammunition ledger.`)); }
  async function importData(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const backup = parseBackup(await file.text());
      if (!window.confirm(text(`${backup.sessions.length}件のセッションを現在のデータへ統合しますか？\n現在のデータは削除されません。`, `Merge ${backup.sessions.length} sessions into the current data?\nCurrent data will not be deleted.`))) return;
      onImport(backup);
      setMessage(text(`${backup.sessions.length}件のバックアップを読み込みました。`, `Imported ${backup.sessions.length} sessions from backup.`));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : text("バックアップを読み込めませんでした。", "Could not import the backup."));
    }
  }
  return <section className="data-management"><header><div><p className="eyebrow">DATA BACKUP</p><h2>{text("バックアップ", "Backup")}</h2><p>{text("端末内の全データをJSONファイルとして保存・復元します。", "Save or restore all data on this device as a JSON file.")}</p></div><button onClick={onBack}>{text("履歴へ戻る", "Back to history")}</button></header><div className="data-panels"><article className="local-data-panel"><span>BACKUP</span><h3>{text("バックアップを書き出す", "Export backup")}</h3><p>{text("現在の全データをJSONファイルとしてMacへ保存します。", "Save all current data as a JSON file.")}</p><strong>{sessions.length}<small> {text("セッション", "sessions")}</small></strong><button className="primary-button" onClick={exportData}>{text("バックアップを保存", "Save backup")}</button></article><article className="local-data-panel"><span>RESTORE</span><h3>{text("バックアップを読み込む", "Import backup")}</h3><p>{text("既存データを残したまま、バックアップの内容を統合します。", "Merge a backup without removing existing data.")}</p><strong>JSON<small> {text("ファイル", "file")}</small></strong><input ref={fileInput} hidden accept="application/json,.json" type="file" onChange={importData} /><button onClick={() => fileInput.current?.click()}>{text("ファイルを選択", "Choose file")}</button></article></div>{message && <p className="data-message">{message}</p>}<aside><strong>{text("クラウド同期とは独立したバックアップ", "Backup independent of cloud sync")}</strong><p>{text("アカウント設定のクラウド同期に加えて、定期的にJSONバックアップを保存してください。", "In addition to cloud sync, save a JSON backup regularly.")}</p></aside></section>;
}
