import type { CloudSyncView } from "../hooks/useCloudSync";
import "./CloudSyncStatus.css";

interface Props {
  view: CloudSyncView;
  onSync: () => Promise<void>;
}

function cloudSyncStatusLabel(view: CloudSyncView): string {
  if (view.phase === "synced" && view.pendingChanges) return "同期待ち";
  if (view.phase === "synced") return "同期済み";
  if (view.phase === "syncing") return "同期中";
  if (view.phase === "offline") return "オフライン";
  if (view.phase === "error") return "要確認";
  if (view.phase === "starting") return "接続中";
  return "未接続";
}

function formatCloudSyncTime(value: string): string {
  if (!value) return "未同期";
  return new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function CloudSyncStatus({ view, onSync }: Props) {
  const busy = view.phase === "starting" || view.phase === "syncing";
  const signedIn = view.phase !== "signed-out" && !!view.email;
  if (!signedIn) return null;
  return <section className={`cloud-sync-status ${view.phase}${view.pendingChanges ? " pending" : ""}`} aria-label="クラウド同期状態" aria-live="polite">
    <div className="cloud-sync-status__state"><i aria-hidden="true" /><div><span>CLOUD SYNC</span><strong>{cloudSyncStatusLabel(view)}</strong></div></div>
    <div className="cloud-sync-status__message"><p>{view.message}</p><small>最終同期：{formatCloudSyncTime(view.lastSyncedAt)}</small></div>
    <div className="cloud-sync-status__pending"><small>同期待ち</small><strong>{view.pendingChanges ? `${view.pendingChanges}件` : "なし"}</strong></div>
    <button type="button" disabled={busy} onClick={() => void onSync()}>{busy ? "同期中…" : "今すぐ同期"}</button>
  </section>;
}
