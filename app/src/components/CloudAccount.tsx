import { useState, type FormEvent } from "react";
import type { CloudSyncView } from "../hooks/useCloudSync";
import "./CloudAccount.css";

type AuthMode = "sign-in" | "sign-up";

interface Props {
  view: CloudSyncView;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<string>;
  onSignOut: () => Promise<void>;
  onSync: () => Promise<void>;
  onDeleteAccount: () => Promise<void>;
}

function formatSyncedAt(value: string): string {
  if (!value) return "未同期";
  return new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function CloudAccount({ view, onSignIn, onSignUp, onSignOut, onSync, onDeleteAccount }: Props) {
  const [authMode, setAuthMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

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
    if (authMode === "sign-up" && password !== passwordConfirmation) {
      setNotice("");
      setError("確認用パスワードが一致していません。");
      return;
    }
    void run(async () => {
      if (authMode === "sign-in") {
        await onSignIn(email.trim(), password);
        return;
      }
      const message = await onSignUp(email.trim(), password);
      setNotice(message);
    });
  }

  function changeAuthMode(mode: AuthMode) {
    setAuthMode(mode);
    setPassword("");
    setPasswordConfirmation("");
    setNotice("");
    setError("");
  }

  const signedIn = view.phase !== "signed-out" && !!view.email;
  const syncing = view.phase === "syncing" || view.phase === "starting";
  return <article className="cloud-account">
    <div className="cloud-account-heading"><div><span>CLOUD SYNC</span><h3>Mac・iPhoneのデータ同期</h3><p>端末内へ保存したあと、Supabaseへ自動同期します。圏外でも入力は継続できます。</p></div><i className={`cloud-state ${view.phase}`}>{view.phase === "synced" ? "同期済み" : view.phase === "syncing" ? "同期中" : view.phase === "offline" ? "オフライン" : view.phase === "error" ? "要確認" : signedIn ? "接続中" : "未接続"}</i></div>
    {signedIn ? <><div className="cloud-signed-in"><div><small>ログイン中</small><strong>{view.email}</strong><p>{view.message}</p><small>最終同期：{formatSyncedAt(view.lastSyncedAt)}</small></div><div className="cloud-actions"><button disabled={busy || syncing} className="primary-button" onClick={() => void run(onSync)}>今すぐ同期</button><button disabled={busy || syncing} onClick={() => void run(onSignOut)}>ログアウト</button></div></div><div className="cloud-account-delete"><button disabled={busy || syncing} className="delete-link" onClick={() => { setShowDelete((current) => !current); setDeleteConfirmation(""); }}>アカウントを削除</button>{showDelete && <div className="delete-confirmation"><strong>クラウドアカウントを完全に削除</strong><p>クラウド上のデータとログイン資格が削除され、元に戻せません。端末内の記録は残ります。</p><label>確認のためメールアドレスを入力<input type="email" autoComplete="off" value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} /></label><button disabled={busy || syncing || deleteConfirmation.trim() !== view.email} className="danger-button" onClick={() => void run(async () => { await onDeleteAccount(); setShowDelete(false); setDeleteConfirmation(""); setNotice("アカウントを削除しました。端末内の記録は残っています。"); })}>完全に削除する</button></div>}</div></> : <><div className="cloud-auth-tabs" role="group" aria-label="認証方法"><button type="button" className={authMode === "sign-in" ? "selected" : ""} aria-pressed={authMode === "sign-in"} onClick={() => changeAuthMode("sign-in")}>ログイン</button><button type="button" className={authMode === "sign-up" ? "selected" : ""} aria-pressed={authMode === "sign-up"} onClick={() => changeAuthMode("sign-up")}>新規登録</button></div><form className={authMode === "sign-up" ? "sign-up-form" : "sign-in-form"} onSubmit={submit}><label className={authMode === "sign-up" ? "email-field" : ""}>メールアドレス<input required name="username" type="email" inputMode="email" autoCapitalize="none" spellCheck={false} autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>パスワード<input required name="password" minLength={8} type="password" autoComplete={authMode === "sign-in" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} /></label>{authMode === "sign-up" && <label>パスワード（確認）<input required name="password-confirmation" minLength={8} type="password" autoComplete="new-password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} /></label>}<div className="cloud-auth-submit"><button disabled={busy} className="primary-button" type="submit">{authMode === "sign-in" ? "ログイン" : "アカウントを作成"}</button><small>パスワードはMac・iPhoneのパスワード管理に保存できます。</small></div></form></>}
    {notice && <p className="cloud-notice">{notice}</p>}
    {error && <p className="cloud-error">{error}</p>}
  </article>;
}
