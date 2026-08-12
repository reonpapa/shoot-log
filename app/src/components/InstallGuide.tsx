import "./InstallGuide.css";
import { useLanguage } from "../i18n/LanguageContext";

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
  const { text } = useLanguage();
  const browser = currentBrowser();
  const installed = isInstalled();
  return <details className="install-guide" open={initiallyOpen && !installed}>
    <summary>
      <div><span>APP INSTALL</span><strong>{text("アプリとしてインストール", "Install as an app")}</strong><small>{text("ホーム画面やDockから、通常のアプリのように起動できます。", "Launch from your Home Screen or Dock like a regular app.")}</small></div>
      <i className={installed ? "installed" : ""}>{installed ? text("インストール済み", "Installed") : text("手順を見る", "View steps")}</i>
    </summary>
    <div className="install-guide-content">
      <p>{text("使用中のブラウザーに合った手順でインストールしてください。アプリを削除しても、クラウド上の記録は削除されません。", "Follow the steps for your browser. Removing the app does not delete cloud records.")}</p>
      <div className="install-browser-grid">
        <article className={browser === "safari" ? "current" : ""}>
          <header><strong>Safari</strong>{browser === "safari" && <span>{text("このブラウザー", "Current browser")}</span>}</header>
          <div><b>iPhone / iPad</b><ol><li>{text("共有ボタンを押す", "Tap Share")}</li><li>{text("「ホーム画面に追加」", "Choose Add to Home Screen")}</li><li>{text("「Webアプリとして開く」を有効", "Enable Open as Web App")}</li><li>{text("「追加」を押す", "Tap Add")}</li></ol></div>
          <div><b>Mac</b><ol><li>{text("メニューバーの「ファイル」", "Choose File in the menu bar")}</li><li>{text("「Dockに追加」", "Choose Add to Dock")}</li><li>{text("「追加」を押す", "Click Add")}</li></ol></div>
        </article>
        <article className={browser === "chrome" ? "current" : ""}>
          <header><strong>Chrome</strong>{browser === "chrome" && <span>{text("このブラウザー", "Current browser")}</span>}</header>
          <div><b>{text("パソコン", "Computer")}</b><ol><li>{text("右上の「︙」を押す", "Open the top-right menu (︙)")}</li><li>{text("「キャスト、保存、共有」", "Choose Cast, save and share")}</li><li>{text("「ページをアプリとしてインストール」", "Choose Install page as app")}</li></ol></div>
          <div><b>iPhone / iPad</b><ol><li>{text("共有ボタンを押す", "Tap Share")}</li><li>{text("「ホーム画面に追加」", "Choose Add to Home Screen")}</li><li>{text("「追加」を押す", "Tap Add")}</li></ol></div>
          <div><b>Android</b><ol><li>{text("右上の「︙」を押す", "Open the top-right menu (︙)")}</li><li>{text("「ホーム画面に追加」", "Choose Add to Home Screen")}</li><li>{text("「インストール」を押す", "Tap Install")}</li></ol></div>
        </article>
        <article className={browser === "edge" ? "current" : ""}>
          <header><strong>Edge</strong>{browser === "edge" && <span>{text("このブラウザー", "Current browser")}</span>}</header>
          <div><b>{text("パソコン", "Computer")}</b><ol><li>{text("右上の「…」を押す", "Open the top-right menu (…)")}</li><li>{text("「アプリ」を開く", "Open Apps")}</li><li>{text("「このサイトをアプリとしてインストール」", "Choose Install this site as an app")}</li><li>{text("「インストール」を押す", "Click Install")}</li></ol></div>
        </article>
      </div>
      {browser === "other" && <p className="install-browser-note">{text("Safari、Chrome、Edgeのいずれかでこのページを開くと、インストールできます。", "Open this page in Safari, Chrome, or Edge to install the app.")}</p>}
    </div>
  </details>;
}
