import { useState, type FormEvent } from "react";
import type { CloudSyncView } from "../hooks/useCloudSync";
import "./CloudAccount.css";

interface Props {
  view: CloudSyncView;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<string>;
  onSignOut: () => Promise<void>;
  onSync: () => Promise<void>;
}

function formatSyncedAt(value: string): string {
  if (!value) return "未同期";
  return new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function CloudAccount({ view, onSignIn, onSignUp, onSignOut, onSync }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try { await action(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "処理に失敗しました。"); }
    finally { setBusy(false); }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void run(() => onSignIn(email.trim(), password));
  }

  const signedIn = view.phase !== "signed-out" && !!view.email;
  const syncing = view.phase === "syncing" || view.phase === "starting";
  return <article className="cloud-account">
    <div className="cloud-account-heading"><div><span>CLOUD SYNC</span><h3>Mac・iPhoneのデータ同期</h3><p>端末内へ保存したあと、Supabaseへ自動同期します。圏外でも入力は継続できます。</p></div><i className={`cloud-state ${view.phase}`}>{view.phase === "synced" ? "同期済み" : view.phase === "syncing" ? "同期中" : view.phase === "offline" ? "オフライン" : view.phase === "error" ? "要確認" : signedIn ? "接続中" : "未接続"}</i></div>
    {signedIn ? <div className="cloud-signed-in"><div><small>ログイン中</small><strong>{view.email}</strong><p>{view.message}</p><small>最終同期：{formatSyncedAt(view.lastSyncedAt)}</small></div><div className="cloud-actions"><button disabled={busy || syncing} className="primary-button" onClick={() => void run(onSync)}>今すぐ同期</button><button disabled={busy || syncing} onClick={() => void run(onSignOut)}>ログアウト</button></div></div> : <form onSubmit={submit}><label>メールアドレス<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>パスワード<input required minLength={8} type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label><div className="cloud-actions"><button disabled={busy} className="primary-button" type="submit">ログイン</button><button disabled={busy} type="button" onClick={() => void run(async () => { const message = await onSignUp(email.trim(), password); setNotice(message); })}>新規アカウント作成</button></div></form>}
    {notice && <p className="cloud-notice">{notice}</p>}
    {error && <p className="cloud-error">{error}</p>}
  </article>;
}
