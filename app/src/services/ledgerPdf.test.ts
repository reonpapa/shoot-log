import { describe, expect, it } from "vitest";
import { canUseBrowserPrint, isStandaloneDisplay, shouldUseShareSheet } from "./ledgerPdf";

const view = (standalone: boolean) => ({ matchMedia: ((query: string) => ({ matches: standalone && query.includes("standalone") })) as Window["matchMedia"] });
const device = (userAgent: string, options: { standalone?: boolean; platform?: string; maxTouchPoints?: number } = {}) => ({
  userAgent,
  platform: options.platform ?? "iPhone",
  maxTouchPoints: options.maxTouchPoints ?? 5,
  ...(options.standalone === undefined ? {} : { standalone: options.standalone }),
}) as Navigator & { standalone?: boolean };

const iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)";
const mac = "Mozilla/5.0 (Macintosh; Intel Mac OS X)";

describe("帳簿PDFの出力手段", () => {
  it("iPhoneのホーム画面アプリでは印刷ダイアログを使えない", () => {
    expect(canUseBrowserPrint(view(true), device(iphone, { standalone: true }))).toBe(false);
  });

  it("iPhoneでもSafariのタブなら印刷できる", () => {
    expect(canUseBrowserPrint(view(false), device(iphone, { standalone: false }))).toBe(true);
  });

  it("PCやAndroidのインストール済みアプリは印刷できる", () => {
    expect(canUseBrowserPrint(view(true), device(mac, { platform: "MacIntel", maxTouchPoints: 0 }))).toBe(true);
    expect(canUseBrowserPrint(view(true), device("Mozilla/5.0 (Linux; Android 15)", { platform: "Linux armv8l", maxTouchPoints: 5 }))).toBe(true);
  });

  it("display-mode から起動形態を判定する", () => {
    expect(isStandaloneDisplay(view(true), device(iphone))).toBe(true);
    expect(isStandaloneDisplay(view(false), device(iphone, { standalone: false }))).toBe(false);
  });

  it("iPhoneとiPadは共有シートへ渡す", () => {
    const file = new File(["%PDF-1.4"], "ledger.pdf", { type: "application/pdf" });
    const sharing = { canShare: () => true, share: async () => undefined } as unknown as Navigator;
    expect(shouldUseShareSheet({ ...device(iphone), ...sharing } as Navigator, file)).toBe(true);
  });

  it("Macは共有シートに「ファイルに保存」が無いのでダウンロードへ回す", () => {
    const file = new File(["%PDF-1.4"], "ledger.pdf", { type: "application/pdf" });
    const macDevice = { ...device(mac, { platform: "MacIntel", maxTouchPoints: 0 }), canShare: () => true, share: async () => undefined } as unknown as Navigator;
    expect(shouldUseShareSheet(macDevice, file)).toBe(false);
  });

  it("共有APIが無い環境もダウンロードへ回す", () => {
    const file = new File(["%PDF-1.4"], "ledger.pdf", { type: "application/pdf" });
    expect(shouldUseShareSheet(device(iphone) as Navigator, file)).toBe(false);
  });
});
