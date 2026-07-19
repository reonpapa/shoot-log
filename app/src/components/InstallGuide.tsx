import "./InstallGuide.css";

type BrowserName = "safari" | "chrome" | "edge" | "other";

interface IosNavigator extends Navigator {
  standalone?: boolean;
}

function currentBrowser(): BrowserName {
  const userAgent = navigator.userAgent;
  if (/Edg\//i.test(userAgent) || /EdgiOS|EdgA/i.test(userAgent)) return "edge";
  if (/Chrome\//i.test(userAgent) || /CriOS/i.test(userAgent)) return "chrome";
  if (/Safari\//i.test(userAgent)) return "safari";
  return "other";
}

function isInstalled(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as IosNavigator).standalone === true;
}

interface Props {
  initiallyOpen: boolean;
}

export function InstallGuide({ initiallyOpen }: Props) {
  const browser = currentBrowser();
  const installed = isInstalled();
  return <details className="install-guide" open={initiallyOpen && !installed}>
    <summary>
      <div><span>APP INSTALL</span><strong>アプリとしてインストール</strong><small>ホーム画面やDockから、通常のアプリのように起動できます。</small></div>
      <i className={installed ? "installed" : ""}>{installed ? "インストール済み" : "手順を見る"}</i>
    </summary>
    <div className="install-guide-content">
      <p>使用中のブラウザーに合った手順でインストールしてください。アプリを削除しても、クラウド上の記録は削除されません。</p>
      <div className="install-browser-grid">
        <article className={browser === "safari" ? "current" : ""}>
          <header><strong>Safari</strong>{browser === "safari" && <span>このブラウザー</span>}</header>
          <div><b>iPhone・iPad</b><ol><li>共有ボタンを押す</li><li>「ホーム画面に追加」</li><li>「Webアプリとして開く」を有効</li><li>「追加」を押す</li></ol></div>
          <div><b>Mac</b><ol><li>メニューバーの「ファイル」</li><li>「Dockに追加」</li><li>「追加」を押す</li></ol></div>
        </article>
        <article className={browser === "chrome" ? "current" : ""}>
          <header><strong>Chrome</strong>{browser === "chrome" && <span>このブラウザー</span>}</header>
          <div><b>パソコン</b><ol><li>右上の「︙」を押す</li><li>「キャスト、保存、共有」</li><li>「ページをアプリとしてインストール」</li></ol></div>
          <div><b>iPhone・iPad</b><ol><li>共有ボタンを押す</li><li>「ホーム画面に追加」</li><li>「追加」を押す</li></ol></div>
          <div><b>Android</b><ol><li>右上の「︙」を押す</li><li>「ホーム画面に追加」</li><li>「インストール」を押す</li></ol></div>
        </article>
        <article className={browser === "edge" ? "current" : ""}>
          <header><strong>Edge</strong>{browser === "edge" && <span>このブラウザー</span>}</header>
          <div><b>パソコン</b><ol><li>右上の「…」を押す</li><li>「アプリ」を開く</li><li>「このサイトをアプリとしてインストール」</li><li>「インストール」を押す</li></ol></div>
        </article>
      </div>
      {browser === "other" && <p className="install-browser-note">Safari、Chrome、Edgeのいずれかでこのページを開くと、インストールできます。</p>}
    </div>
  </details>;
}
