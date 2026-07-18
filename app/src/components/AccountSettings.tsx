import type { CloudSyncView } from "../hooks/useCloudSync";
import { CloudAccount } from "./CloudAccount";
import "./AccountSettings.css";

interface Props {
  cloud: CloudSyncView;
  onBack: () => void;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<string>;
  onSignOut: () => Promise<void>;
  onSync: () => Promise<void>;
  onDeleteAccount: () => Promise<void>;
}

export function AccountSettings({ cloud, onBack, onSignIn, onSignUp, onSignOut, onSync, onDeleteAccount }: Props) {
  return <section className="account-settings">
    <header>
      <div><p className="eyebrow">ACCOUNT SETTINGS</p><h2>アカウント設定</h2><p>ログイン、クラウド同期、アカウントの管理を行います。</p></div>
      <button onClick={onBack}>履歴へ戻る</button>
    </header>
    <CloudAccount view={cloud} onSignIn={onSignIn} onSignUp={onSignUp} onSignOut={onSignOut} onSync={onSync} onDeleteAccount={onDeleteAccount} />
    <aside><strong>端末内データについて</strong><p>射撃記録は端末内へ即時保存され、ログイン中はクラウドへ自動同期されます。JSONファイルの保存・復元は「バックアップ」画面で行います。</p></aside>
  </section>;
}
