/**
 * 実包管理帳簿をPDFにして保存・共有する。
 * iOSのホーム画面アプリ（スタンドアロンPWA）はブラウザの印刷機能を持たないため、
 * 印刷ダイアログに頼らずアプリ内でPDFを組み立てる。
 */

type PrintCapableNavigator = Pick<Navigator, "userAgent" | "platform" | "maxTouchPoints">;

const A4_LANDSCAPE_MM = { width: 297, height: 210 } as const;

function isIos(device: PrintCapableNavigator): boolean {
  return /iPad|iPhone|iPod/.test(device.userAgent) || (device.platform === "MacIntel" && device.maxTouchPoints > 1);
}

/** ホーム画面アプリとして起動しているか。 */
export function isStandaloneDisplay(view: { matchMedia: Window["matchMedia"] }, device: Navigator & { standalone?: boolean }): boolean {
  return view.matchMedia("(display-mode: standalone)").matches || device.standalone === true;
}

/** ブラウザの印刷ダイアログが使えるか。iOSのホーム画面アプリでは使えない。 */
export function canUseBrowserPrint(view: { matchMedia: Window["matchMedia"] }, device: Navigator & { standalone?: boolean }): boolean {
  return !(isIos(device) && isStandaloneDisplay(view, device));
}

/**
 * 共有シートへ渡すべきか。
 * iOS/iPadOSはダウンロードが扱いづらいので共有シートを使う。
 * macOSの共有シートには「ファイルに保存」が無く保存できないため、デスクトップはダウンロードにする。
 */
export function shouldUseShareSheet(device: Navigator & { standalone?: boolean }, file: File): boolean {
  if (!isIos(device)) return false;
  return typeof device.canShare === "function" && device.canShare({ files: [file] }) && typeof device.share === "function";
}

/** 共有がユーザー操作から離れて拒否されたか。iOSはタップ直後でないと共有シートを開けない。 */
export function isGestureError(error: unknown): boolean {
  const name = (error as { name?: string } | null)?.name;
  return name === "NotAllowedError" || name === "SecurityError" || name === "InvalidStateError";
}

/** 共有を利用者が閉じただけか。 */
export function isAbortError(error: unknown): boolean {
  return (error as { name?: string } | null)?.name === "AbortError";
}

/**
 * 印刷用のページ要素をそのままPDFの各ページへ描画する。
 * 文字はブラウザが描画した見た目をそのまま使うので、日本語フォントの埋め込みは不要。
 */
export async function buildLedgerPdfFile(root: HTMLElement, fileName: string): Promise<File> {
  const pages = [...root.querySelectorAll<HTMLElement>(".print-page")];
  if (pages.length === 0) throw new Error("出力できる帳簿ページがありません。");

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
  const document_ = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });

  root.classList.add("exporting");
  try {
    for (const [index, page] of pages.entries()) {
      const canvas = await html2canvas(page, { scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false });
      if (index > 0) document_.addPage("a4", "landscape");
      document_.addImage(canvas.toDataURL("image/jpeg", 0.9), "JPEG", 0, 0, A4_LANDSCAPE_MM.width, A4_LANDSCAPE_MM.height, undefined, "FAST");
    }
  } finally {
    root.classList.remove("exporting");
  }

  return new File([document_.output("blob")], fileName, { type: "application/pdf" });
}

/** 共有シートへ渡す。拒否された場合は呼び出し側で再タップを促す。 */
export async function shareLedgerPdf(file: File): Promise<void> {
  await navigator.share({ files: [file], title: file.name });
}

/** 端末へ保存する。共有シートを使わない環境向け。 */
export function downloadLedgerPdf(file: File): void {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.name;
  anchor.rel = "noopener";
  // 一部のブラウザは、DOMに無いリンクや早すぎるrevokeでダウンロードを取りこぼす。
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
