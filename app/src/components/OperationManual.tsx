import { useEffect, useState } from "react";
import { shouldUseManualShareSheet } from "./manualSharing";
import "./OperationManual.css";
import { useLanguage } from "../i18n/LanguageContext";

const APP_VERSION = "2.25.2";
const MANUAL_REVISION = "8";

type ManualState = "loading" | "ready" | "saving" | "saved" | "error";

export function OperationManual() {
  const { language, text } = useLanguage();
  const manualUrl = `${import.meta.env.BASE_URL}manuals/${language === "en" ? "shoot-log-operation-manual-en.pdf" : "shoot-log-operation-manual.pdf"}?v=${APP_VERSION}-manual${MANUAL_REVISION}`;
  const manualFilename = `shoot-log-v${APP_VERSION}-operation-manual-${language}.pdf`;
  const usesShareSheet = shouldUseManualShareSheet(navigator);
  const [manualFile, setManualFile] = useState<File | null>(null);
  const [manualState, setManualState] = useState<ManualState>(usesShareSheet ? "loading" : "ready");
  const [viewerOpen, setViewerOpen] = useState(false);

  useEffect(() => {
    if (!usesShareSheet) return;
    let active = true;

    const prepareManual = async () => {
      try {
        const response = await fetch(manualUrl);
        if (!response.ok) throw new Error(`Manual download failed: ${response.status}`);
        const blob = await response.blob();
        if (!active) return;
        setManualFile(new File([blob], manualFilename, { type: "application/pdf" }));
        setManualState("ready");
      } catch {
        if (active) setManualState("error");
      }
    };

    void prepareManual();
    return () => { active = false; };
  }, [manualFilename, manualUrl, usesShareSheet]);

  useEffect(() => {
    if (!viewerOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setViewerOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeWithEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeWithEscape);
    };
  }, [viewerOpen]);

  const saveManual = async () => {
    if (!manualFile) return;
    setManualState("saving");

    try {
      const shareData: ShareData = {
        files: [manualFile],
        title: text("Shoot Log 操作マニュアル", "Shoot Log Operation Manual"),
      };
      const canShareFile = usesShareSheet
        && typeof navigator.share === "function"
        && (typeof navigator.canShare !== "function" || navigator.canShare(shareData));

      if (canShareFile) {
        await navigator.share(shareData);
      } else {
        const objectUrl = URL.createObjectURL(manualFile);
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = manualFilename;
        document.body.append(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      }
      setManualState("saved");
    } catch (error) {
      setManualState(error instanceof DOMException && error.name === "AbortError" ? "ready" : "error");
    }
  };

  const buttonLabel = manualState === "loading"
    ? text("マニュアルを準備中…", "Preparing manual…")
    : manualState === "saving"
      ? usesShareSheet ? text("保存画面を開いています…", "Opening save sheet…") : text("ダウンロードしています…", "Downloading…")
      : usesShareSheet ? text("操作マニュアルを保存", "Save operation manual") : text("操作マニュアルをダウンロード", "Download operation manual");

  return <section className="operation-manual">
    <div className="operation-manual-heading">
      <div>
        <span>OPERATION MANUAL</span>
        <h3>{text("操作マニュアル", "Operation manual")}</h3>
        <p>{text("インストールから射撃入力、分析、実包管理、バックアップまでを画像付きで説明します。", "Covers installation, score entry, analysis, ammunition, permits, and backup.")}</p>
      </div>
      <strong>{text("PDF・全19ページ", "PDF · 19 pages")}</strong>
    </div>
    {usesShareSheet ? <button
        className="operation-manual-download"
        type="button"
        disabled={!manualFile || manualState === "saving"}
        onClick={() => void saveManual()}
      >
        <span>{buttonLabel}</span>
        <small>{text(`Version ${APP_VERSION}対応`, `For Version ${APP_VERSION}`)}</small>
      </button> : <button className="operation-manual-download" type="button" onClick={() => setViewerOpen(true)}>
        <span>{text("操作マニュアルを開く", "Open operation manual")}</span>
        <small>{text(`Version ${APP_VERSION}対応・アプリ内で表示`, `For Version ${APP_VERSION} · Opens in app`)}</small>
      </button>}
    <p className="operation-manual-note">{text("iPhone・iPadでは共有画面の「ファイルに保存」を選びます。Mac・Windowsではアプリ内でPDFを開き、上部のボタンでアカウント設定へ戻れます。", "On iPhone or iPad, choose Save to Files in the share sheet. On Mac or Windows, the PDF opens inside the app.")}</p>
    {manualState === "saved" && <p className="operation-manual-status" role="status">{usesShareSheet ? text("保存操作を開始しました。", "Save operation started.") : text("ダウンロードを開始しました。", "Download started.")}</p>}
    {manualState === "error" && <p className="operation-manual-status is-error" role="alert">{text("マニュアルを準備できませんでした。通信状態を確認して、もう一度この画面を開いてください。", "Could not prepare the manual. Check your connection and reopen this screen.")}</p>}
    {viewerOpen && <div className="operation-manual-viewer" role="dialog" aria-modal="true" aria-label="Shoot Log 操作マニュアル">
      <header>
        <div><span>OPERATION MANUAL</span><strong>{text("Shoot Log 操作マニュアル", "Shoot Log Operation Manual")}</strong></div>
        <button type="button" autoFocus onClick={() => setViewerOpen(false)}>{text("アカウント設定へ戻る", "Back to account")}</button>
      </header>
      <iframe src={manualUrl} title={text("Shoot Log 操作マニュアル PDF", "Shoot Log Operation Manual PDF")} />
    </div>}
  </section>;
}
