import { useState, type FormEvent } from "react";
import type { CloudSyncView } from "../hooks/useCloudSync";
import "./CloudAccount.css";

type AuthMode = "sign-in" | "sign-up" | "forgot-password";

interface Props {
  view: CloudSyncView;
  passwordRecovery: boolean;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<string>;
  onSignOut: () => Promise<void>;
  onSendPasswordReset: (email: string) => Promise<void>;
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  onCompletePasswordRecovery: (newPassword: string) => Promise<void>;
  onSync: () => Promise<void>;
  onDeleteAccount: () => Promise<void>;
}

function formatSyncedAt(value: string): string {
  if (!value) return "未同期";
  return new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function readableError(caught: unknown): string {
  if (!(caught instanceof Error) || !caught.message || caught.message === "{}") return "処理に失敗しました。通信状態を確認して、もう一度お試しください。";
  if (/invalid login credentials/i.test(caught.message)) return "メールアドレスまたはパスワードが正しくありません。";
  if (/email not confirmed/i.test(caught.message)) return "メールアドレスの確認が完了していません。確認メールのリンクを開いてください。";
  return caught.message;
}

export function CloudAccount({ view, passwordRecovery, onSignIn, onSignUp, onSignOut, onSendPasswordReset, onChangePassword, onCompletePasswordRecovery, onSync, onDeleteAccount }: Props) {
  const [authMode, setAuthMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try { await action(); }
    catch (caught) { setError(readableError(caught)); }
    finally { setBusy(false); }
  }

  function changeAuthMode(mode: AuthMode) {
    setAuthMode(mode);
    setPassword("");
    setPasswordConfirmation("");
    setNotice("");
    setError("");
  }

  function submitAuth(event: FormEvent) {
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

  function submitPasswordResetRequest(event: FormEvent) {
    event.preventDefault();
    void run(async () => {
      await onSendPasswordReset(email.trim());
      setNotice("パスワード再設定メールを送信しました。メール内のリンクを開いてください。");
    });
  }

  function submitPasswordChange(event: FormEvent) {
    event.preventDefault();
    if (newPassword !== newPasswordConfirmation) {
      setNotice("");
      setError("新しいパスワードと確認用パスワードが一致していません。");
      return;
    }
    void run(async () => {
      await onChangePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirmation("");
      setShowPasswordChange(false);
      setNotice("パスワードを変更しました。端末のパスワード管理も更新してください。");
    });
  }

  function submitPasswordRecovery(event: FormEvent) {
    event.preventDefault();
    if (newPassword !== newPasswordConfirmation) {
      setNotice("");
      setError("新しいパスワードと確認用パスワードが一致していません。");
      return;
    }
    void run(async () => {
      await onCompletePasswordRecovery(newPassword);
      setNewPassword("");
      setNewPasswordConfirmation("");
      setNotice("新しいパスワードを設定しました。");
    });
  }

  const signedIn = view.phase !== "signed-out" && !!view.email;
  const syncing = view.phase === "syncing" || view.phase === "starting";

  return <article className="cloud-account">
    <div className="cloud-account-heading">
      <div><span>CLOUD SYNC</span><h3>Mac・iPhoneのデータ同期</h3><p>端末内へ保存したあと、Supabaseへ自動同期します。圏外でも入力は継続できます。</p></div>
      <i className={`cloud-state ${view.phase}`}>{view.phase === "synced" ? "同期済み" : view.phase === "syncing" ? "同期中" : view.phase === "offline" ? "オフライン" : view.phase === "error" ? "要確認" : signedIn ? "接続中" : "未接続"}</i>
    </div>

    {passwordRecovery ? <section className="password-panel password-recovery-panel">
      <div><strong>新しいパスワードを設定</strong><p>再設定メールの確認が完了しました。新しいパスワードを2回入力してください。</p></div>
      <form onSubmit={submitPasswordRecovery}>
        <label>新しいパスワード<input required minLength={8} name="new-password" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label>
        <label>新しいパスワード（確認）<input required minLength={8} name="new-password-confirmation" type="password" autoComplete="new-password" value={newPasswordConfirmation} onChange={(event) => setNewPasswordConfirmation(event.target.value)} /></label>
        <div className="password-panel-actions"><button disabled={busy || !signedIn} className="primary-button" type="submit">新しいパスワードを保存</button></div>
      </form>
    </section> : signedIn ? <>
      <div className="cloud-signed-in">
        <div><small>ログイン中</small><strong>{view.email}</strong><p>{view.message}</p><small>最終同期：{formatSyncedAt(view.lastSyncedAt)}</small></div>
        <div className="cloud-actions"><button disabled={busy || syncing} className="primary-button" onClick={() => void run(onSync)}>今すぐ同期</button><button disabled={busy || syncing} onClick={() => void run(onSignOut)}>ログアウト</button></div>
      </div>
      <div className="cloud-security-settings">
        <button disabled={busy || syncing} className="settings-link" onClick={() => { setShowPasswordChange((current) => !current); setShowDelete(false); setError(""); setNotice(""); }}>パスワードを変更</button>
        {showPasswordChange && <section className="password-panel">
          <div><strong>パスワードを変更</strong><p>現在のパスワードを確認して、新しいパスワードへ変更します。</p></div>
          <form onSubmit={submitPasswordChange}>
            <label>現在のパスワード<input required minLength={8} name="current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label>
            <label>新しいパスワード<input required minLength={8} name="new-password" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label>
            <label>新しいパスワード（確認）<input required minLength={8} name="new-password-confirmation" type="password" autoComplete="new-password" value={newPasswordConfirmation} onChange={(event) => setNewPasswordConfirmation(event.target.value)} /></label>
            <div className="password-panel-actions"><button disabled={busy} className="primary-button" type="submit">パスワードを変更</button><button type="button" onClick={() => setShowPasswordChange(false)}>キャンセル</button></div>
          </form>
        </section>}
      </div>
      <div className="cloud-account-delete">
        <button disabled={busy || syncing} className="delete-link" onClick={() => { setShowDelete((current) => !current); setShowPasswordChange(false); setDeleteConfirmation(""); }}>アカウントを削除</button>
        {showDelete && <div className="delete-confirmation"><strong>クラウドアカウントを完全に削除</strong><p>クラウド上のデータとログイン資格が削除され、元に戻せません。端末内の記録は残ります。</p><label>確認のためメールアドレスを入力<input type="email" autoComplete="off" value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} /></label><button disabled={busy || syncing || deleteConfirmation.trim() !== view.email} className="danger-button" onClick={() => void run(async () => { await onDeleteAccount(); setShowDelete(false); setDeleteConfirmation(""); setNotice("アカウントを削除しました。端末内の記録は残っています。"); })}>完全に削除する</button></div>}
      </div>
    </> : authMode === "forgot-password" ? <section className="password-panel forgot-password-panel">
      <div><strong>パスワードを再設定</strong><p>登録済みのメールアドレスへ再設定リンクを送信します。</p></div>
      <form onSubmit={submitPasswordResetRequest}>
        <label>メールアドレス<input required name="username" type="email" inputMode="email" autoCapitalize="none" spellCheck={false} autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <div className="password-panel-actions"><button disabled={busy} className="primary-button" type="submit">再設定メールを送信</button><button type="button" onClick={() => changeAuthMode("sign-in")}>ログインへ戻る</button></div>
      </form>
    </section> : <>
      <div className="cloud-auth-tabs" role="group" aria-label="認証方法"><button type="button" className={authMode === "sign-in" ? "selected" : ""} aria-pressed={authMode === "sign-in"} onClick={() => changeAuthMode("sign-in")}>ログイン</button><button type="button" className={authMode === "sign-up" ? "selected" : ""} aria-pressed={authMode === "sign-up"} onClick={() => changeAuthMode("sign-up")}>新規登録</button></div>
      <form className={authMode === "sign-up" ? "sign-up-form" : "sign-in-form"} onSubmit={submitAuth}>
        <label className={authMode === "sign-up" ? "email-field" : ""}>メールアドレス<input required name="username" type="email" inputMode="email" autoCapitalize="none" spellCheck={false} autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label>パスワード<input required name="password" minLength={8} type="password" autoComplete={authMode === "sign-in" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        {authMode === "sign-up" && <label>パスワード（確認）<input required name="password-confirmation" minLength={8} type="password" autoComplete="new-password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} /></label>}
        <div className="cloud-auth-submit"><button disabled={busy} className="primary-button" type="submit">{authMode === "sign-in" ? "ログイン" : "アカウントを作成"}</button><small>パスワードはMac・iPhoneのパスワード管理に保存できます。</small></div>
      </form>
      {authMode === "sign-in" && <button type="button" className="forgot-password-link" onClick={() => changeAuthMode("forgot-password")}>パスワードを忘れた場合</button>}
    </>}

    {notice && <p className="cloud-notice">{notice}</p>}
    {error && <p className="cloud-error">{error}</p>}
  </article>;
}
