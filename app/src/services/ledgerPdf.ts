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

/** 生成したPDFを共有シートへ渡せるか。iOSはダウンロードより共有が確実。 */
export function canShareFile(device: Navigator, file: File): boolean {
  return typeof device.canShare === "function" && device.canShare({ files: [file] }) && typeof device.share === "function";
}

export interface LedgerPdfResult {
  pages: number;
  delivery: "shared" | "downloaded";
}

/**
 * 印刷用のページ要素をそのままPDFの各ページへ描画する。
 * 文字はブラウザが描画した見た目をそのまま使うので、日本語フォントの埋め込みは不要。
 */
export async function exportLedgerPdf(root: HTMLElement, fileName: string): Promise<LedgerPdfResult> {
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

  const blob = document_.output("blob");
  const file = new File([blob], fileName, { type: "application/pdf" });

  if (canShareFile(navigator, file)) {
    await navigator.share({ files: [file], title: fileName });
    return { pages: pages.length, delivery: "shared" };
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
  return { pages: pages.length, delivery: "downloaded" };
}
