import type { CloudHealthView, CloudSyncView } from "../hooks/useCloudSync";
import { CloudAccount } from "./CloudAccount";
import { CloudHealthStatus } from "./CloudHealthStatus";
import { InstallGuide } from "./InstallGuide";
import "./AccountSettings.css";

interface Props {
  cloud: CloudSyncView;
  health: CloudHealthView;
  passwordRecovery: boolean;
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
}

export function AccountSettings({ cloud, health, passwordRecovery, onBack, onPrivacy, onTerms, onContact, onSignIn, onSignUp, onSignOut, onSendPasswordReset, onChangePassword, onCompletePasswordRecovery, onSync, onCheckHealth, onDeleteAccount }: Props) {
  const signedIn = cloud.phase !== "signed-out" && !!cloud.email;
  return <section className="account-settings">
    <header>
      <div><p className="eyebrow">ACCOUNT SETTINGS</p><h2>アカウント設定</h2><p>ログイン、クラウド同期、アカウントの管理を行います。</p></div>
      {signedIn && <button onClick={onBack}>履歴へ戻る</button>}
    </header>
    <InstallGuide initiallyOpen={!signedIn} />
    <CloudAccount view={cloud} passwordRecovery={passwordRecovery} onPrivacy={onPrivacy} onTerms={onTerms} onSignIn={onSignIn} onSignUp={onSignUp} onSignOut={onSignOut} onSendPasswordReset={onSendPasswordReset} onChangePassword={onChangePassword} onCompletePasswordRecovery={onCompletePasswordRecovery} onSync={onSync} onDeleteAccount={onDeleteAccount} />
    <CloudHealthStatus health={health} onCheck={onCheckHealth} />
    <aside><strong>端末内データについて</strong><p>射撃記録は端末内へ即時保存され、ログイン中はクラウドへ自動同期されます。JSONファイルの保存・復元は「バックアップ」画面で行います。</p></aside>
    <nav className="account-legal-links" aria-label="運営情報"><button onClick={onContact}>お問い合わせ</button><button onClick={onTerms}>利用規約・免責事項</button><button onClick={onPrivacy}>プライバシーポリシー</button></nav>
  </section>;
}
