import { useRef, useState, type ChangeEvent } from "react";
import { createBackup, downloadBackup, parseBackup, type ShootLogBackup } from "../services/backup";
import type { MasterData } from "../services/masterData";
import type { AmmunitionLedgerData } from "../domain/ammunition";
import type { StoredSession } from "../services/storage";
import type { CloudSyncView } from "../hooks/useCloudSync";
import { CloudAccount } from "./CloudAccount";
import "./DataManagement.css";

interface Props {
  sessions: StoredSession[];
  masterData: MasterData;
  ammunitionLedger: AmmunitionLedgerData;
  cloud: CloudSyncView;
  onBack: () => void;
  onImport: (backup: ShootLogBackup) => void;
  onCloudSignIn: (email: string, password: string) => Promise<void>;
  onCloudSignUp: (email: string, password: string) => Promise<string>;
  onCloudSignOut: () => Promise<void>;
  onCloudSync: () => Promise<void>;
}

export function DataManagement({ sessions, masterData, ammunitionLedger, cloud, onBack, onImport, onCloudSignIn, onCloudSignUp, onCloudSignOut, onCloudSync }: Props) {
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
  return <section className="data-management"><header><div><p className="eyebrow">DATA MANAGEMENT</p><h2>バックアップと同期</h2><p>クラウド同期とJSONバックアップで、すべての記録を保護します。</p></div><button onClick={onBack}>履歴へ戻る</button></header><div className="data-panels"><CloudAccount view={cloud} onSignIn={onCloudSignIn} onSignUp={onCloudSignUp} onSignOut={onCloudSignOut} onSync={onCloudSync} /><article className="local-data-panel"><span>BACKUP</span><h3>バックアップを書き出す</h3><p>現在の全データをJSONファイルとしてMacへ保存します。</p><strong>{sessions.length}<small> セッション</small></strong><button className="primary-button" onClick={exportData}>バックアップを保存</button></article><article className="local-data-panel"><span>RESTORE</span><h3>バックアップを読み込む</h3><p>既存データを残したまま、バックアップの内容を統合します。</p><strong>JSON<small> ファイル</small></strong><input ref={fileInput} hidden accept="application/json,.json" type="file" onChange={importData} /><button onClick={() => fileInput.current?.click()}>ファイルを選択</button></article></div>{message && <p className="data-message">{message}</p>}<aside><strong>二重のデータ保護</strong><p>クラウド同期後もJSONバックアップは継続します。通信できない場合は端末内へ保存し、接続後に自動同期します。</p></aside></section>;
}
