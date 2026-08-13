import type { CloudHealthView, CloudSyncView } from "../hooks/useCloudSync";
import type { Firearm } from "../domain/ammunition";
import { CloudAccount } from "./CloudAccount";
import { CloudHealthStatus } from "./CloudHealthStatus";
import { CloudSyncStatus } from "./CloudSyncStatus";
import { InstallGuide } from "./InstallGuide";
import { OperationManual } from "./OperationManual";
import { PermitCountdown } from "./PermitCountdown";
import "./AccountSettings.css";
import { useLanguage } from "../i18n/LanguageContext";

interface Props {
  cloud: CloudSyncView;
  health: CloudHealthView;
  passwordRecovery: boolean;
  firearms: Firearm[];
  onBack: () => void;
  onPrivacy: () => void;
  onTerms: () => void;
  onContact: () => void;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<string>;
  onSignOut: () => Promise<void>;
  onSendPasswordReset: (email: string) => Promise<void>;
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  onCompletePasswordRecovery: (newPassword: string) => Promise<void>;
  onSync: () => Promise<void>;
  onCheckHealth: () => Promise<void>;
  onDeleteAccount: () => Promise<void>;
  onPermit: () => void;
  isAdmin: boolean;
  onAdmin: () => void;
}

export function AccountSettings({ cloud, health, passwordRecovery, firearms, onBack, onPrivacy, onTerms, onContact, onSignIn, onSignUp, onSignOut, onSendPasswordReset, onChangePassword, onCompletePasswordRecovery, onSync, onCheckHealth, onDeleteAccount, onPermit, isAdmin, onAdmin }: Props) {
  const { language, setLanguage, text } = useLanguage();
  const signedIn = cloud.phase !== "signed-out" && !!cloud.email;
  return <section className="account-settings">
    <header>
      <div><p className="eyebrow">ACCOUNT SETTINGS</p><h2>{text("アカウント設定", "Account settings")}</h2><p>{text("ログイン、クラウド同期、アカウントの管理を行います。", "Manage your sign-in, cloud sync, and account.")}</p></div>
      {signedIn && <button onClick={onBack}>{text("履歴へ戻る", "Back to history")}</button>}
    </header>
    <section className="language-settings">
      <div><p className="eyebrow">LANGUAGE</p><strong>{text("表示言語", "Display language")}</strong><small>{text("端末ごとに保存され、記録データには影響しません。", "Saved on this device. Your shooting data is not changed.")}</small></div>
      <div role="group" aria-label={text("表示言語", "Display language")}><button lang={language === "ja" ? "ja" : "en"} className={language === "ja" ? "selected" : ""} aria-pressed={language === "ja"} onClick={() => setLanguage("ja")}>{text("日本語", "Japanese")}</button><button lang="en" className={language === "en" ? "selected" : ""} aria-pressed={language === "en"} onClick={() => setLanguage("en")}>English</button></div>
    </section>
    {signedIn && <div className="account-mobile-status"><CloudSyncStatus view={cloud} onSync={onSync} /><PermitCountdown firearms={firearms} onOpen={onPermit} /></div>}
    <InstallGuide initiallyOpen={!signedIn} />
    <OperationManual />
    {isAdmin && <section className="account-admin-link"><div><p className="eyebrow">ADMIN</p><strong>{text("管理者専用画面", "Admin dashboard")}</strong><small>{text("匿名の利用状況とバージョン分布を確認します。", "View anonymous usage and version statistics.")}</small></div><button onClick={onAdmin}>{text("集計を開く", "Open analytics")}</button></section>}
    <CloudAccount view={cloud} passwordRecovery={passwordRecovery} onPrivacy={onPrivacy} onTerms={onTerms} onSignIn={onSignIn} onSignUp={onSignUp} onSignOut={onSignOut} onSendPasswordReset={onSendPasswordReset} onChangePassword={onChangePassword} onCompletePasswordRecovery={onCompletePasswordRecovery} onSync={onSync} onDeleteAccount={onDeleteAccount} />
    <CloudHealthStatus health={health} onCheck={onCheckHealth} />
    <aside><strong>{text("端末内データについて", "Data on this device")}</strong><p>{text("射撃記録は端末内へ即時保存され、ログイン中はクラウドへ自動同期されます。JSONファイルの保存・復元は「バックアップ」画面で行います。", "Records are saved immediately on this device and synced to the cloud while signed in. Use Backup to save or restore a JSON file.")}</p></aside>
    <nav className="account-legal-links" aria-label={text("運営情報", "Legal and support")}><button onClick={onContact}>{text("お問い合わせ", "Contact")}</button><button onClick={onTerms}>{text("利用規約・免責事項", "Terms & disclaimer")}</button><button onClick={onPrivacy}>{text("プライバシーポリシー", "Privacy policy")}</button></nav>
  </section>;
}
