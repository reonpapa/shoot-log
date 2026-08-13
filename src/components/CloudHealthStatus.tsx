import type { CloudHealthView } from "../hooks/useCloudSync";
import "./CloudHealthStatus.css";
import { localizeSystemMessage, useLanguage } from "../i18n/LanguageContext";

interface Props {
  health: CloudHealthView;
  onCheck: () => Promise<void>;
}

function formatCheckedAt(value: string, locale: string, empty: string): string {
  if (!value) return empty;
  return new Intl.DateTimeFormat(locale, {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

export function CloudHealthStatus({ health, onCheck }: Props) {
  const { language, locale, text } = useLanguage();
  const statusLabel = { healthy: text("正常", "Healthy"), offline: text("オフライン", "Offline"), error: text("要確認", "Check required"), checking: text("確認中", "Checking") }[health.status];
  return <article className="cloud-health-status">
    <div className="cloud-health-heading">
      <div><span>CLOUD HEALTH</span><h3>{text("クラウド稼働状況", "Cloud status")}</h3><p>{text("起動時・画面復帰時・起動中にSupabaseへ自動接続確認します。", "Automatically checks the Supabase connection at launch, resume, and while running.")}</p></div>
      <i className={health.status}>{statusLabel}</i>
    </div>
    <div className="cloud-health-details">
      <div><small>{text("最終確認", "Last checked")}</small><strong>{formatCheckedAt(health.lastCheckedAt, locale, text("確認前", "Not checked"))}</strong></div>
      {health.lastHealthyAt && health.status !== "healthy" && <div><small>{text("最終正常", "Last healthy")}</small><strong>{formatCheckedAt(health.lastHealthyAt, locale, text("確認前", "Not checked"))}</strong></div>}
      <p>{localizeSystemMessage(health.message, language)}</p>
      <button disabled={health.status === "checking"} onClick={() => void onCheck()}>{text("再確認", "Check again")}</button>
    </div>
  </article>;
}
