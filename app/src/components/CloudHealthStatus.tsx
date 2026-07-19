import type { CloudHealthView } from "../hooks/useCloudSync";
import "./CloudHealthStatus.css";

interface Props {
  health: CloudHealthView;
  onCheck: () => Promise<void>;
}

function formatCheckedAt(value: string): string {
  if (!value) return "確認前";
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function statusLabel(status: CloudHealthView["status"]): string {
  if (status === "healthy") return "正常";
  if (status === "offline") return "オフライン";
  if (status === "error") return "要確認";
  return "確認中";
}

export function CloudHealthStatus({ health, onCheck }: Props) {
  return <article className="cloud-health-status">
    <div className="cloud-health-heading">
      <div><span>CLOUD HEALTH</span><h3>クラウド稼働状況</h3><p>起動時・画面復帰時・起動中にSupabaseへ自動接続確認します。</p></div>
      <i className={health.status}>{statusLabel(health.status)}</i>
    </div>
    <div className="cloud-health-details">
      <div><small>最終確認</small><strong>{formatCheckedAt(health.lastCheckedAt)}</strong></div>
      {health.lastHealthyAt && health.status !== "healthy" && <div><small>最終正常</small><strong>{formatCheckedAt(health.lastHealthyAt)}</strong></div>}
      <p>{health.message}</p>
      <button disabled={health.status === "checking"} onClick={() => void onCheck()}>再確認</button>
    </div>
  </article>;
}
