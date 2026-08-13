import { useState, type FormEvent } from "react";
import type { CloudSyncView } from "../hooks/useCloudSync";
import "./CloudAccount.css";
import { localizeSystemMessage, useLanguage } from "../i18n/LanguageContext";

type AuthMode = "sign-in" | "sign-up" | "forgot-password";

interface Props {
  view: CloudSyncView;
  passwordRecovery: boolean;
  onPrivacy: () => void;
  onTerms: () => void;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<string>;
  onSignOut: () => Promise<void>;
  onSendPasswordReset: (email: string) => Promise<void>;
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  onCompletePasswordRecovery: (newPassword: string) => Promise<void>;
  onSync: () => Promise<void>;
  onDeleteAccount: () => Promise<void>;
}

function formatSyncedAt(value: string, locale: string, empty: string): string {
  if (!value) return empty;
  return new Intl.DateTimeFormat(locale, { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

const authErrorMessages: Record<string, string> = {
  invalid_credentials: "メールアドレスまたはパスワードが正しくありません。",
  email_not_confirmed: "メールアドレスの確認が完了していません。確認メールのリンクを開いてください。",
  same_password: "現在と同じパスワードは設定できません。異なるパスワードを入力してください。",
  weak_password: "パスワードの強度が不足しています。8文字以上で、推測されにくいパスワードを入力してください。",
  otp_expired: "再設定リンクの有効期限が切れています。もう一度、再設定メールを送信してください。",
  flow_state_expired: "認証リンクの有効期限が切れています。もう一度、最初から操作してください。",
  flow_state_not_found: "認証リンクを確認できませんでした。もう一度、最初から操作してください。",
  session_expired: "ログインの有効期限が切れました。もう一度ログインしてください。",
  session_not_found: "ログイン状態を確認できませんでした。もう一度ログインしてください。",
  refresh_token_not_found: "ログイン状態を確認できませんでした。もう一度ログインしてください。",
  refresh_token_already_used: "ログイン状態が更新されました。アプリを再読み込みして、もう一度ログインしてください。",
  over_email_send_rate_limit: "メール送信回数の上限に達しました。時間をおいてから、もう一度お試しください。",
  over_request_rate_limit: "操作回数の上限に達しました。数分待ってから、もう一度お試しください。",
  email_exists: "このメールアドレスはすでに登録されています。ログインまたはパスワード再設定をお試しください。",
  user_already_exists: "このメールアドレスはすでに登録されています。ログインまたはパスワード再設定をお試しください。",
  email_address_invalid: "このメールアドレスは使用できません。入力内容を確認してください。",
  email_address_not_authorized: "このメールアドレスには送信できません。メール送信設定を確認してください。",
  email_provider_disabled: "メールアドレスによる登録が無効になっています。管理者へ確認してください。",
  signup_disabled: "現在、新しいアカウントを登録できません。管理者へ確認してください。",
  reauthentication_needed: "安全のため再認証が必要です。ログインし直してから、もう一度お試しください。",
  reauthentication_not_valid: "再認証に失敗しました。もう一度お試しください。",
  validation_failed: "入力内容を確認してください。",
  captcha_failed: "本人確認に失敗しました。もう一度お試しください。",
  request_timeout: "認証処理がタイムアウトしました。通信状態を確認して、もう一度お試しください。",
  unexpected_failure: "認証サービスでエラーが発生しました。時間をおいてから、もう一度お試しください。",
  user_banned: "このアカウントは現在利用できません。管理者へ確認してください。",
  user_not_found: "アカウントを確認できませんでした。メールアドレスを確認してください。",
};

function readableError(caught: unknown): string {
  const details = caught && typeof caught === "object" ? caught as { code?: unknown; status?: unknown } : {};
  const code = typeof details.code === "string" ? details.code : "";
  if (code && authErrorMessages[code]) return authErrorMessages[code];
  const message = caught instanceof Error ? caught.message : "";
  if (/invalid login credentials/i.test(message)) return authErrorMessages.invalid_credentials;
  if (/email not confirmed/i.test(message)) return authErrorMessages.email_not_confirmed;
  if (/new password should be different|password.*different from (the )?(old|current)|same password/i.test(message)) return authErrorMessages.same_password;
  if (/password should be at least|password.*too short|weak password/i.test(message)) return authErrorMessages.weak_password;
  if (/auth session missing|session.*expired|otp.*expired/i.test(message)) return authErrorMessages.session_expired;
  if (/email rate limit exceeded|too many emails/i.test(message)) return authErrorMessages.over_email_send_rate_limit;
  if (/rate limit|too many requests/i.test(message) || details.status === 429) return authErrorMessages.over_request_rate_limit;
  if (/failed to fetch|network|load failed/i.test(message)) return "通信できませんでした。接続状態を確認して、もう一度お試しください。";
  return "認証処理に失敗しました。入力内容と通信状態を確認して、もう一度お試しください。";
}

export function CloudAccount({ view, passwordRecovery, onPrivacy, onTerms, onSignIn, onSignUp, onSignOut, onSendPasswordReset, onChangePassword, onCompletePasswordRecovery, onSync, onDeleteAccount }: Props) {
  const { language, locale, text } = useLanguage();
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
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try { await action(); }
    catch (caught) { setError(language === "ja" ? readableError(caught) : "Authentication failed. Check your details and connection, then try again."); }
    finally { setBusy(false); }
  }

  function changeAuthMode(mode: AuthMode) {
    setAuthMode(mode);
    setPassword("");
    setPasswordConfirmation("");
    setAcceptedTerms(false);
    setNotice("");
    setError("");
  }

  function submitAuth(event: FormEvent) {
    event.preventDefault();
    if (authMode === "sign-up" && password !== passwordConfirmation) {
      setNotice("");
      setError(text("確認用パスワードが一致していません。", "The confirmation password does not match."));
      return;
    }
    if (authMode === "sign-up" && !acceptedTerms) {
      setNotice("");
      setError(text("利用規約とプライバシーポリシーへの同意が必要です。", "You must agree to the Terms and Privacy Policy."));
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
      setNotice(text("パスワード再設定メールを送信しました。メール内のリンクを開いてください。", "Password reset email sent. Open the link in the email."));
    });
  }

  function submitPasswordChange(event: FormEvent) {
    event.preventDefault();
    if (newPassword !== newPasswordConfirmation) {
      setNotice("");
      setError(text("新しいパスワードと確認用パスワードが一致していません。", "The new password confirmation does not match."));
      return;
    }
    void run(async () => {
      await onChangePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirmation("");
      setShowPasswordChange(false);
      setNotice(text("パスワードを変更しました。端末のパスワード管理も更新してください。", "Password changed. Update your device password manager as well."));
    });
  }

  function submitPasswordRecovery(event: FormEvent) {
    event.preventDefault();
    if (newPassword !== newPasswordConfirmation) {
      setNotice("");
      setError(text("新しいパスワードと確認用パスワードが一致していません。", "The new password confirmation does not match."));
      return;
    }
    void run(async () => {
      await onCompletePasswordRecovery(newPassword);
      setNewPassword("");
      setNewPasswordConfirmation("");
      setNotice(text("新しいパスワードを設定しました。", "New password saved."));
    });
  }

  const signedIn = view.phase !== "signed-out" && !!view.email;
  const syncing = view.phase === "syncing" || view.phase === "starting";

  return <article className="cloud-account">
    <div className="cloud-account-heading">
      <div><span>CLOUD SYNC</span><h3>{text("複数端末のデータ同期", "Sync across devices")}</h3><p>{text("同じアカウントでログインしたパソコンやスマートフォン間で、記録を自動同期します。圏外でも入力でき、通信復帰後にクラウドへ同期します。", "Automatically sync records between signed-in computers and phones. You can enter scores offline and sync when the connection returns.")}</p></div>
      <i className={`cloud-state ${view.phase}`}>{view.phase === "synced" ? text("同期済み", "Synced") : view.phase === "syncing" ? text("同期中", "Syncing") : view.phase === "offline" ? text("オフライン", "Offline") : view.phase === "error" ? text("要確認", "Check required") : signedIn ? text("接続中", "Connecting") : text("未接続", "Not connected")}</i>
    </div>

    {passwordRecovery ? <section className="password-panel password-recovery-panel">
      <div><strong>{text("新しいパスワードを設定", "Set a new password")}</strong><p>{text("再設定メールの確認が完了しました。新しいパスワードを2回入力してください。", "Reset email verified. Enter your new password twice.")}</p></div>
      <form onSubmit={submitPasswordRecovery}>
        <label>{text("新しいパスワード", "New password")}<input required minLength={8} name="new-password" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label>
        <label>{text("新しいパスワード（確認）", "Confirm new password")}<input required minLength={8} name="new-password-confirmation" type="password" autoComplete="new-password" value={newPasswordConfirmation} onChange={(event) => setNewPasswordConfirmation(event.target.value)} /></label>
        <div className="password-panel-actions"><button disabled={busy || !signedIn} className="primary-button" type="submit">{text("新しいパスワードを保存", "Save new password")}</button></div>
      </form>
    </section> : signedIn ? <>
      <div className="cloud-signed-in">
        <div><small>{text("ログイン中", "Signed in")}</small><strong>{view.email}</strong><p>{localizeSystemMessage(view.message, language)}</p><small>{text("最終同期：", "Last sync: ")}{formatSyncedAt(view.lastSyncedAt, locale, text("未同期", "Never"))}</small></div>
        <div className="cloud-actions"><button disabled={busy || syncing} className="primary-button manual-sync-button" onClick={() => void run(onSync)}>{text("今すぐ同期", "Sync now")}</button><button disabled={busy || syncing} onClick={() => void run(onSignOut)}>{text("ログアウト", "Sign out")}</button></div>
      </div>
      <div className="cloud-security-settings">
        <button disabled={busy || syncing} className="settings-link" onClick={() => { setShowPasswordChange((current) => !current); setShowDelete(false); setError(""); setNotice(""); }}>{text("パスワードを変更", "Change password")}</button>
        {showPasswordChange && <section className="password-panel">
          <div><strong>{text("パスワードを変更", "Change password")}</strong><p>{text("現在のパスワードを確認して、新しいパスワードへ変更します。", "Verify your current password, then set a new one.")}</p></div>
          <form onSubmit={submitPasswordChange}>
            <label>{text("現在のパスワード", "Current password")}<input required minLength={8} name="current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label>
            <label>{text("新しいパスワード", "New password")}<input required minLength={8} name="new-password" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label>
            <label>{text("新しいパスワード（確認）", "Confirm new password")}<input required minLength={8} name="new-password-confirmation" type="password" autoComplete="new-password" value={newPasswordConfirmation} onChange={(event) => setNewPasswordConfirmation(event.target.value)} /></label>
            <div className="password-panel-actions"><button disabled={busy} className="primary-button" type="submit">{text("パスワードを変更", "Change password")}</button><button type="button" onClick={() => setShowPasswordChange(false)}>{text("キャンセル", "Cancel")}</button></div>
          </form>
        </section>}
      </div>
      <div className="cloud-account-delete">
        <button disabled={busy || syncing} className="delete-link" onClick={() => { setShowDelete((current) => !current); setShowPasswordChange(false); setDeleteConfirmation(""); }}>{text("アカウントを削除", "Delete account")}</button>
        {showDelete && <div className="delete-confirmation"><strong>{text("クラウドアカウントを完全に削除", "Permanently delete cloud account")}</strong><p>{text("クラウド上のデータとログイン資格が削除され、元に戻せません。端末内の記録は残ります。", "Cloud data and sign-in credentials will be deleted permanently. Records on this device remain.")}</p><label>{text("確認のためメールアドレスを入力", "Enter your email to confirm")}<input type="email" autoComplete="off" value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} /></label><button disabled={busy || syncing || deleteConfirmation.trim() !== view.email} className="danger-button" onClick={() => void run(async () => { await onDeleteAccount(); setShowDelete(false); setDeleteConfirmation(""); setNotice(text("アカウントを削除しました。端末内の記録は残っています。", "Account deleted. Records on this device remain.")); })}>{text("完全に削除する", "Delete permanently")}</button></div>}
      </div>
    </> : authMode === "forgot-password" ? <section className="password-panel forgot-password-panel">
      <div><strong>{text("パスワードを再設定", "Reset password")}</strong><p>{text("登録済みのメールアドレスへ再設定リンクを送信します。", "Send a reset link to your registered email address.")}</p></div>
      <form onSubmit={submitPasswordResetRequest}>
        <label>{text("メールアドレス", "Email address")}<input required name="username" type="email" inputMode="email" autoCapitalize="none" spellCheck={false} autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <div className="password-panel-actions"><button disabled={busy} className="primary-button" type="submit">{text("再設定メールを送信", "Send reset email")}</button><button type="button" onClick={() => changeAuthMode("sign-in")}>{text("ログインへ戻る", "Back to sign in")}</button></div>
      </form>
    </section> : <>
      <div className="cloud-auth-tabs" role="group" aria-label={text("認証方法", "Authentication method")}><button type="button" className={authMode === "sign-in" ? "selected" : ""} aria-pressed={authMode === "sign-in"} onClick={() => changeAuthMode("sign-in")}>{text("ログイン", "Sign in")}</button><button type="button" className={authMode === "sign-up" ? "selected" : ""} aria-pressed={authMode === "sign-up"} onClick={() => changeAuthMode("sign-up")}>{text("新規登録", "Create account")}</button></div>
      <form className={authMode === "sign-up" ? "sign-up-form" : "sign-in-form"} onSubmit={submitAuth}>
        <label className={authMode === "sign-up" ? "email-field" : ""}>{text("メールアドレス", "Email address")}<input required name="username" type="email" inputMode="email" autoCapitalize="none" spellCheck={false} autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label>{text("パスワード", "Password")}<input required name="password" minLength={8} type="password" autoComplete={authMode === "sign-in" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        {authMode === "sign-up" && <label>{text("パスワード（確認）", "Confirm password")}<input required name="password-confirmation" minLength={8} type="password" autoComplete="new-password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} /></label>}
        {authMode === "sign-up" && <div className="auth-legal-consent"><label><input required type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} /><span>{text("内容を確認し、同意します。", "I have reviewed and agree.")}</span></label><nav aria-label={text("登録条件", "Registration terms")}><button type="button" onClick={onTerms}>{text("利用規約・免責事項を読む", "Read Terms & Disclaimer")}</button><button type="button" onClick={onPrivacy}>{text("プライバシーポリシーを読む", "Read Privacy Policy")}</button></nav></div>}
        <div className="cloud-auth-submit"><button disabled={busy || (authMode === "sign-up" && !acceptedTerms)} className="primary-button" type="submit">{authMode === "sign-in" ? text("ログイン", "Sign in") : text("アカウントを作成", "Create account")}</button><small>{text("パスワードは端末やブラウザーのパスワード管理に保存できます。", "You can save the password in your device or browser password manager.")}</small></div>
      </form>
      {authMode === "sign-in" && <button type="button" className="forgot-password-link" onClick={() => changeAuthMode("forgot-password")}>{text("パスワードを忘れた場合", "Forgot password?")}</button>}
    </>}

    {notice && <p className="cloud-notice">{notice}</p>}
    {error && <p className="cloud-error">{error}</p>}
  </article>;
}
