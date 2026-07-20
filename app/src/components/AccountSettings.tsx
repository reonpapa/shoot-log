import type { CloudHealthView, CloudSyncView } from "../hooks/useCloudSync";
import type { Firearm } from "../domain/ammunition";
import { CloudAccount } from "./CloudAccount";
import { CloudHealthStatus } from "./CloudHealthStatus";
import { CloudSyncStatus } from "./CloudSyncStatus";
import { InstallGuide } from "./InstallGuide";
import { OperationManual } from "./OperationManual";
import { PermitCountdown } from "./PermitCountdown";
import "./AccountSettings.css";

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
}

export function AccountSettings({ cloud, health, passwordRecovery, firearms, onBack, onPrivacy, onTerms, onContact, onSignIn, onSignUp, onSignOut, onSendPasswordReset, onChangePassword, onCompletePasswordRecovery, onSync, onCheckHealth, onDeleteAccount, onPermit }: Props) {
  const signedIn = cloud.phase !== "signed-out" && !!cloud.email;
  return <section className="account-settings">
    <header>
      <div><p className="eyebrow">ACCOUNT SETTINGS</p><h2>アカウント設定</h2><p>ログイン、クラウド同期、アカウントの管理を行います。</p></div>
      {signedIn && <button onClick={onBack}>履歴へ戻る</button>}
    </header>
    {signedIn && <div className="account-mobile-status"><CloudSyncStatus view={cloud} onSync={onSync} /><PermitCountdown firearms={firearms} onOpen={onPermit} /></div>}
    <InstallGuide initiallyOpen={!signedIn} />
    <OperationManual />
    <CloudAccount view={cloud} passwordRecovery={passwordRecovery} onPrivacy={onPrivacy} onTerms={onTerms} onSignIn={onSignIn} onSignUp={onSignUp} onSignOut={onSignOut} onSendPasswordReset={onSendPasswordReset} onChangePassword={onChangePassword} onCompletePasswordRecovery={onCompletePasswordRecovery} onSync={onSync} onDeleteAccount={onDeleteAccount} />
    <CloudHealthStatus health={health} onCheck={onCheckHealth} />
    <aside><strong>端末内データについて</strong><p>射撃記録は端末内へ即時保存され、ログイン中はクラウドへ自動同期されます。JSONファイルの保存・復元は「バックアップ」画面で行います。</p></aside>
    <nav className="account-legal-links" aria-label="運営情報"><button onClick={onContact}>お問い合わせ</button><button onClick={onTerms}>利用規約・免責事項</button><button onClick={onPrivacy}>プライバシーポリシー</button></nav>
  </section>;
}
