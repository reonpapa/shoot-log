import { useCallback, useEffect, useState } from "react";
import { loadAdminStats, type AdminStats } from "../services/adminAnalytics";
import { useLanguage } from "../i18n/LanguageContext";
import "./AdminDashboard.css";

interface Props { onBack: () => void }

export function AdminDashboard({ onBack }: Props) {
  const { text } = useLanguage();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true); setError("");
    try { setStats(await loadAdminStats()); }
    catch { setError(text("集計を取得できませんでした。Supabaseの管理者設定を確認してください。", "Could not load analytics. Check the Supabase admin setup.")); }
    finally { setLoading(false); }
  }, [text]);
  useEffect(() => {
    let active = true;
    void loadAdminStats().then((value) => {
      if (active) setStats(value);
    }).catch(() => {
      if (active) setError(text("集計を取得できませんでした。Supabaseの管理者設定を確認してください。", "Could not load analytics. Check the Supabase admin setup."));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [text]);
  const cards = stats ? [
    [text("登録ユーザー", "Registered users"), stats.registeredUsers],
    [text("今日の利用", "Active today"), stats.activeToday],
    [text("過去7日", "Last 7 days"), stats.active7Days],
    [text("過去30日", "Last 30 days"), stats.active30Days],
    [text("PWA起動ユーザー", "PWA users"), stats.standaloneUsers],
    [text("累計起動", "Total launches"), stats.totalLaunches],
  ] as const : [];
  return <section className="admin-dashboard">
    <header><div><p className="eyebrow">ADMIN ANALYTICS</p><h2>{text("管理者専用画面", "Admin dashboard")}</h2><p>{text("個人の射撃記録やメールアドレスを含まない利用統計です。", "Usage analytics without shooting records or email addresses.")}</p></div><button onClick={onBack}>{text("アカウント設定へ戻る", "Back to account")}</button></header>
    <div className="admin-dashboard__actions"><button onClick={() => void refresh()} disabled={loading}>{loading ? text("集計中…", "Loading…") : text("最新情報に更新", "Refresh")}</button></div>
    {error && <p className="admin-dashboard__error" role="alert">{error}</p>}
    {stats && <>
      <div className="admin-dashboard__cards">{cards.map(([label, value]) => <article key={label}><span>{label}</span><strong>{value.toLocaleString()}</strong></article>)}</div>
      <div className="admin-dashboard__breakdowns">
        <Breakdown title={text("利用バージョン", "App versions")} items={stats.versions} />
        <Breakdown title={text("表示言語", "Languages")} items={stats.languages.map((item) => ({ ...item, label: item.label === "ja" ? text("日本語", "Japanese") : "English" }))} />
      </div>
      <small>{text("最終集計：", "Generated: ")}{new Date(stats.generatedAt).toLocaleString()}</small>
    </>}
  </section>;
}

function Breakdown({ title, items }: { title: string; items: { label: string; count: number }[] }) {
  return <section><h3>{title}</h3>{items.length === 0 ? <p>—</p> : <ul>{items.map((item) => <li key={item.label}><span>{item.label}</span><strong>{item.count}</strong></li>)}</ul>}</section>;
}
