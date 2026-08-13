import type { CloudSyncView } from "../hooks/useCloudSync";
import "./CloudSyncStatus.css";
import { localizeSystemMessage, useLanguage } from "../i18n/LanguageContext";

interface Props {
  view: CloudSyncView;
  onSync: () => Promise<void>;
}

function formatCloudSyncTime(value: string, locale: string, empty: string): string {
  if (!value) return empty;
  return new Intl.DateTimeFormat(locale, { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function CloudSyncStatus({ view, onSync }: Props) {
  const { language, locale, text } = useLanguage();
  const busy = view.phase === "starting" || view.phase === "syncing";
  const signedIn = view.phase !== "signed-out" && !!view.email;
  if (!signedIn) return null;
  const status = view.phase === "synced" && view.pendingChanges ? text("同期待ち", "Pending") : ({ synced: text("同期済み", "Synced"), syncing: text("同期中", "Syncing"), offline: text("オフライン", "Offline"), error: text("要確認", "Check required"), starting: text("接続中", "Connecting"), "signed-out": text("未接続", "Not connected") }[view.phase]);
  return <section className={`cloud-sync-status ${view.phase}${view.pendingChanges ? " pending" : ""}`} aria-label={text("クラウド同期状態", "Cloud sync status")} aria-live="polite">
    <div className="cloud-sync-status__state"><i aria-hidden="true" /><div><span>CLOUD SYNC</span><strong>{status}</strong></div></div>
    <div className="cloud-sync-status__message"><p>{localizeSystemMessage(view.message, language)}</p><small>{text("最終同期：", "Last sync: ")}{formatCloudSyncTime(view.lastSyncedAt, locale, text("未同期", "Never"))}</small></div>
    <div className="cloud-sync-status__pending"><small>{text("同期待ち", "Pending")}</small><strong>{view.pendingChanges ? text(`${view.pendingChanges}件`, `${view.pendingChanges}`) : text("なし", "None")}</strong></div>
    <button type="button" disabled={busy} onClick={() => void onSync()}>{busy ? text("同期中…", "Syncing…") : text("今すぐ同期", "Sync now")}</button>
  </section>;
}
