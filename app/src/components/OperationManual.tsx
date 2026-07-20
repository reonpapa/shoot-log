import { useEffect, useState } from "react";
import { shouldUseManualShareSheet } from "./manualSharing";
import "./OperationManual.css";

const MANUAL_URL = `${import.meta.env.BASE_URL}manuals/shoot-log-operation-manual.pdf`;
const MANUAL_FILENAME = "shoot-log-v2.19.7-operation-manual.pdf";

type ManualState = "loading" | "ready" | "saving" | "saved" | "error";

export function OperationManual() {
  const [manualFile, setManualFile] = useState<File | null>(null);
  const [manualState, setManualState] = useState<ManualState>("loading");
  const usesShareSheet = shouldUseManualShareSheet(navigator);

  useEffect(() => {
    let active = true;

    const prepareManual = async () => {
      try {
        const response = await fetch(MANUAL_URL);
        if (!response.ok) throw new Error(`Manual download failed: ${response.status}`);
        const blob = await response.blob();
        if (!active) return;
        setManualFile(new File([blob], MANUAL_FILENAME, { type: "application/pdf" }));
        setManualState("ready");
      } catch {
        if (active) setManualState("error");
      }
    };

    void prepareManual();
    return () => { active = false; };
  }, []);

  const saveManual = async () => {
    if (!manualFile) return;
    setManualState("saving");

    try {
      const shareData: ShareData = {
        files: [manualFile],
        title: "Shoot Log 操作マニュアル",
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
        link.download = MANUAL_FILENAME;
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
    ? "マニュアルを準備中…"
    : manualState === "saving"
      ? usesShareSheet ? "保存画面を開いています…" : "ダウンロードしています…"
      : usesShareSheet ? "操作マニュアルを保存" : "操作マニュアルをダウンロード";

  return <section className="operation-manual">
    <div className="operation-manual-heading">
      <div>
        <span>OPERATION MANUAL</span>
        <h3>操作マニュアル</h3>
        <p>インストールから射撃入力、分析、実包管理、バックアップまでを画像付きで説明します。</p>
      </div>
      <strong>PDF・全20ページ</strong>
    </div>
    <button
      className="operation-manual-download"
      type="button"
      disabled={!manualFile || manualState === "saving"}
      onClick={() => void saveManual()}
    >
      <span>{buttonLabel}</span>
      <small>Version 2.19.7対応</small>
    </button>
    <p className="operation-manual-note">iPhone・iPadでは共有画面の「ファイルに保存」を選びます。Mac・WindowsではPDFを直接ダウンロードします。</p>
    {manualState === "saved" && <p className="operation-manual-status" role="status">{usesShareSheet ? "保存操作を開始しました。" : "ダウンロードを開始しました。"}</p>}
    {manualState === "error" && <p className="operation-manual-status is-error" role="alert">マニュアルを準備できませんでした。通信状態を確認して、もう一度この画面を開いてください。</p>}
  </section>;
}
