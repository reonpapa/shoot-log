import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
import { createServer } from "vite";

const VERSION = "2.21.0";
const pdfOnly = process.argv.includes("--pdf-only");
const english = process.argv.includes("--english");
const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(appRoot, "..");
const screenshotDir = join(repoRoot, `docs/manual/screenshots/${english ? "generated-en" : "generated"}`);
const manualOutput = join(appRoot, `public/manuals/shoot-log-operation-manual${english ? "-en" : ""}.pdf`);

const chromeCandidates = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);

const executablePath = chromeCandidates.find((candidate) => existsSync(candidate));
if (!executablePath) {
  throw new Error("Google Chromeが見つかりません。CHROME_PATHにChrome本体のパスを指定してください。");
}

const captures = [
  { name: "01-install", scene: "login", selector: ".install-guide" },
  { name: "02-login", scene: "login", selector: ".cloud-account" },
  { name: "03-account", scene: "account", selector: ".account-settings" },
  { name: "04-history", scene: "history", selector: ".session-list-header" },
  { name: "05-practice-theme", scene: "history", selector: ".active-practice-theme" },
  { name: "06-history-analysis", scene: "history-analysis", selector: ".history-analysis" },
  { name: "07-new-session", scene: "form", selector: ".session-form" },
  { name: "08-round-setup", scene: "round-before", selector: ".round-navigation" },
  { name: "09-current-shot", scene: "round-after", selector: ".current-shot" },
  { name: "10-analysis-summary", scene: "analysis", selector: ".analysis-header" },
  { name: "11-ai-analysis", scene: "analysis&openAi=1", selector: ".ai-analysis-export" },
  { name: "12-session-pace", scene: "analysis", selector: ".session-half-analysis" },
  { name: "13-stand-analysis", scene: "analysis", selector: ".stand-analysis" },
  { name: "14-review", scene: "analysis", selector: ".session-review" },
  { name: "15-master-data", scene: "master", selector: ".master-manager" },
  { name: "16-ammunition-ledger", scene: "ledger", selector: ".ammo-ledger-header" },
  { name: "17-firearm-permit", scene: "permit", selector: ".permit-profile" },
  { name: "18-backup", scene: "backup", selector: ".data-management" },
  { name: "19-support", scene: "support", selector: ".contact-support" },
];

const manualPages = [
  { kicker: "QUICK START", title: "最初に知っておくこと", bullets: ["記録は操作のたびに端末内へ保存されます。", "ログイン中はクラウドへ自動同期されます。", "定期的にJSONバックアップも保存してください。"], images: ["04-history", "08-round-setup"] },
  { kicker: "INSTALL / LOGIN", title: "インストールとログイン", bullets: ["SafariまたはChromeからホーム画面へ追加します。", "メールアドレスとパスワードでログインします。", "認証情報や再設定リンクは他人へ送らないでください。"], images: ["01-install", "02-login"] },
  { kicker: "ACCOUNT / SYNC", title: "アカウント設定と同期", bullets: ["スマートフォンの同期状態と所持許可はアカウント設定にまとめています。", "別端末の更新を確認したい場合は「今すぐ同期」を使います。", "通常は自動同期されます。"], images: ["03-account"] },
  { kicker: "SESSIONS", title: "射撃履歴と練習テーマ", bullets: ["主要操作は射撃履歴のタイトル直下に表示します。", "履歴カードから入力再開または成績分析を開きます。", "継続中のテーマと過去の達成状況を確認できます。"], images: ["04-history", "05-practice-theme"] },
  { kicker: "NEW SESSION", title: "新しいセッションを作る", bullets: ["日付、射撃場、種目、実包、使用銃を選択します。", "天候、気温、風向、風の強さは傾向分析に使用します。", "今日の練習テーマを1つ決めます。"], images: ["07-new-session"] },
  { kicker: "ROUND INPUT", title: "ラウンドの準備", bullets: ["Round 1〜4を上段で切り替えます。", "Round 3以降は追加・削除操作を下段へ分けます。", "新規ラウンドは2発撃ちが初期選択です。"], images: ["08-round-setup"] },
  { kicker: "SCORING", title: "クレーごとの結果を入力", bullets: ["「1」は初矢命中、「2」は二の矢命中を記録します。", "「1＋」は初矢命中後にも二発目を撃った場合に使い、命中は初矢の1点、実包は2発として記録します。", "失中方向はクレーの飛翔方向を記録し、入力後は自動で次へ進みます。"], images: ["09-current-shot"] },
  { kicker: "SESSION COMPLETE", title: "成績分析を見る", bullets: ["総合、ラウンド別、初矢・二の矢、失中方向を確認します。", "数値だけで原因を断定せず、練習の振り返りに利用します。"], images: ["10-analysis-summary"] },
  { kicker: "OPTIONAL AI ANALYSIS", title: "自分のAIで分析する", bullets: ["成績、条件、本人の振り返りを分析用データへ含めます。", "日付、射撃場、銃番号、氏名などは除外します。", "コピー内容を確認し、送信は自分で行います。"], images: ["11-ai-analysis"] },
  { kicker: "SESSION PACE", title: "前半・後半と射台別分析", bullets: ["前半と後半の命中率変化を確認します。", "射台別の命中率と失中したクレーの方向を比較します。"], images: ["12-session-pace", "13-stand-analysis"] },
  { kicker: "REVIEW", title: "射撃後の振り返り", bullets: ["今日の気づき、うまくいかなかったこと、次回試すことを記録します。", "不安や悩みも残すと、AIへ相談するときの背景になります。"], images: ["14-review"] },
  { kicker: "HISTORY ANALYSIS", title: "条件別・実包別の傾向", bullets: ["射撃場、実包、発射方式、期間で履歴を絞り込みます。", "条件差と記録数を確認し、少数データは参考値として扱います。"], images: ["06-history-analysis"] },
  { kicker: "MASTER DATA", title: "登録内容を管理する", bullets: ["射撃場名と実包名を追加・修正します。", "名称変更は過去の履歴にも反映されます。"], images: ["15-master-data"] },
  { kicker: "AMMUNITION LEDGER", title: "実包管理帳簿", bullets: ["受・払・残を記録し、射撃セッションの消費を自動転記します。", "出力前に区分、使用銃、期間を確認します。"], images: ["16-ammunition-ledger"] },
  { kicker: "FIREARM PERMIT", title: "所持許可・更新管理", bullets: ["許可証原本の記載を最優先で入力します。", "更新申請開始日、期限、有効期限を銃ごとに管理します。", "氏名、住所、生年月日は保存しません。"], images: ["17-firearm-permit"] },
  { kicker: "BACKUP", title: "バックアップと復元", bullets: ["端末内の全データをJSONファイルへ保存します。", "復元は現在のデータを残したまま統合します。", "大きな操作の前に最新バックアップを保存してください。"], images: ["18-backup"] },
  { kicker: "SUPPORT", title: "困ったときの確認表", bullets: ["同期されない場合は通信状態とログイン中のアカウントを確認します。", "画面が古い場合は更新通知または復旧操作を使用します。", "問い合わせへパスワードや許可証番号を記載しないでください。"], images: ["19-support"] },
  { kicker: "VERSION HISTORY", title: "主要バージョン履歴", bullets: ["Version 2.21.0：日本語・英語を全画面で切替。履歴、分析、アカウント、実包、所持許可、バックアップ、法的文書、英語版マニュアルに対応。", "Version 2.20.0：初矢命中後に二発目を発射した記録「1＋」を追加。得点と実包消費を分けて集計。", "Version 2.19.14：マニュアルへラウンド準備前・入力中の実画面を分けて掲載。", "Version 2.7.6：iPhoneでアプリを離れずに操作マニュアルを保存できるよう改善。", "Version 2.0.0：Supabaseによるアカウント・クラウド同期を導入。", "Version 1.0.0：PWA、成績PDF、実包管理、所持許可期限管理を統合。"], images: [] },
];

const englishManualPages = [
  { kicker: "QUICK START", title: "What to know first", bullets: ["Every change is saved immediately on this device.", "While signed in, records sync to the cloud automatically.", "Save a JSON backup regularly as an independent copy."], images: ["04-history", "08-round-setup"] },
  { kicker: "INSTALL / LOGIN", title: "Install and sign in", bullets: ["Add Shoot Log to the Home Screen or Dock from Safari, Chrome, or Edge.", "Sign in with your email address and password.", "Never share authentication or password-reset links."], images: ["01-install", "02-login"] },
  { kicker: "ACCOUNT / SYNC", title: "Account settings and sync", bullets: ["Display language, sync status, and firearm permits are managed from Account settings.", "Use Sync now to fetch changes made on another device.", "Normal changes sync automatically."], images: ["03-account"] },
  { kicker: "SESSIONS", title: "History and practice focus", bullets: ["Major actions appear directly below the Shooting history heading.", "Open a history card to continue entry or view analysis.", "Review the current focus and previous achievement results."], images: ["04-history", "05-practice-theme"] },
  { kicker: "NEW SESSION", title: "Create a session", bullets: ["Select date, range, discipline, ammunition, and firearm.", "Weather, temperature, and wind are used for trend analysis.", "Choose one concrete practice focus for the day."], images: ["07-new-session"] },
  { kicker: "ROUND INPUT", title: "Prepare a round", bullets: ["Use the upper tabs to switch between Rounds 1 to 4.", "Add and delete controls for later rounds are separated below.", "New rounds begin in two-shot mode."], images: ["08-round-setup"] },
  { kicker: "SCORING", title: "Enter each target", bullets: ["1 records a first-shot hit and 2 records a second-shot hit.", "1+ records a first-shot hit followed by an extra second shot: one point and two shells.", "Miss direction means the target's flight direction. Entry advances automatically."], images: ["09-current-shot"] },
  { kicker: "SESSION COMPLETE", title: "Review the result", bullets: ["Review totals, rounds, first- and second-shot hits, and miss directions.", "Use the figures for reflection without inferring causes that were not recorded."], images: ["10-analysis-summary"] },
  { kicker: "OPTIONAL AI ANALYSIS", title: "Analyze with your own AI", bullets: ["The export includes scores, conditions, and your written review.", "Dates, range names, firearm identifiers, and personal identity are excluded.", "Review the copied content and send it yourself."], images: ["11-ai-analysis"] },
  { kicker: "SESSION PACE", title: "Pace and stand analysis", bullets: ["Compare hit rates between the first and second halves.", "Compare hit rate and missed target-flight direction by stand."], images: ["12-session-pace", "13-stand-analysis"] },
  { kicker: "REVIEW", title: "Post-session review", bullets: ["Record what you noticed, what did not work, and what to try next.", "Keeping concerns in the record provides context when asking an AI for help."], images: ["14-review"] },
  { kicker: "HISTORY ANALYSIS", title: "Condition and ammunition trends", bullets: ["Filter history by range, ammunition, fire mode, and period.", "Check both condition differences and sample size; treat small samples as indicative."], images: ["06-history-analysis"] },
  { kicker: "MASTER DATA", title: "Manage saved items", bullets: ["Add or rename shooting ranges and ammunition products.", "Renaming is reflected in past history."], images: ["15-master-data"] },
  { kicker: "AMMUNITION LEDGER", title: "Manage ammunition", bullets: ["Record ammunition received, used, and remaining; completed sessions are added automatically.", "Confirm category, firearm, and date range before output."], images: ["16-ammunition-ledger"] },
  { kicker: "FIREARM PERMIT", title: "Permit and renewal", bullets: ["Always copy information from the original permit.", "Manage application start, deadline, and expiry for each firearm.", "Name, address, and date of birth are not stored."], images: ["17-firearm-permit"] },
  { kicker: "BACKUP", title: "Backup and restore", bullets: ["Export all device data to a JSON file.", "Restore merges with current data instead of deleting it.", "Save a fresh backup before major data operations."], images: ["18-backup"] },
  { kicker: "SUPPORT", title: "If something goes wrong", bullets: ["If data does not sync, check the connection and signed-in account.", "If the screen is outdated, use the update notice or safe recovery.", "Never include passwords or firearm permit numbers in support email."], images: ["19-support"] },
  { kicker: "VERSION HISTORY", title: "Major versions", bullets: ["Version 2.21.0: Added Japanese and English throughout the app and an English operation manual.", "Version 2.20.0: Added 1+ to record an extra second shot after a first-shot hit.", "Version 2.19.14: Added separate actual screens for round preparation and score entry.", "Version 2.7.6: Improved manual saving on iPhone without leaving the app.", "Version 2.0.0: Added Supabase accounts and cloud sync.", "Version 1.0.0: Integrated PWA, score PDF, ammunition, and permit deadlines."], images: [] },
];

function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

async function imageData(name) {
  const bytes = await readFile(join(screenshotDir, `${name}.png`));
  return `data:image/png;base64,${bytes.toString("base64")}`;
}

async function buildManualHtml() {
  const selectedPages = english ? englishManualPages : manualPages;
  const noteText = english
    ? "Screens are actual React components displayed at smartphone width in manual capture mode. All data is fictional."
    : "画面はマニュアル撮影モードで、実際のReactコンポーネントをスマートフォン幅に表示したものです。データはすべて架空です。";
  const pages = [];
  for (const page of selectedPages) {
    const images = await Promise.all(page.images.map(async (name) => `<img alt="${escapeHtml(name)}" src="${await imageData(name)}">`));
    const layout = images.length === 0 ? "history-page" : images.length > 1 ? "two-images" : "one-image";
    pages.push(`<section class="page"><header><span>SHOOT LOG / OPERATION MANUAL</span><span>Version ${VERSION}</span></header><main class="${layout}"><div class="copy"><p class="kicker">${escapeHtml(page.kicker)}</p><h1>${escapeHtml(page.title)}</h1><ul>${page.bullets.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>${images.length > 0 ? `<aside>${escapeHtml(noteText)}</aside>` : ""}</div><div class="visuals">${images.join("")}</div></main><footer><span>https://reonpapa.github.io/shoot-log/</span><span>Shoot Log</span></footer></section>`);
  }
  return `<!doctype html><html lang="${english ? "en" : "ja"}"><head><meta charset="UTF-8"><style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #242128; font-family: -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Yu Gothic", sans-serif; }
    .cover, .page { width: 210mm; height: 297mm; break-after: page; overflow: hidden; }
    .cover { position: relative; padding: 28mm 20mm; color: white; background: #17131b; }
    .cover-mark { position: absolute; z-index: 0; top: 18mm; right: 18mm; width: 54mm; height: 54mm; border: 12mm solid #6d3bd1; border-radius: 50%; box-shadow: inset 0 0 0 8mm #a880ff; }
    .cover-mark::after { position: absolute; left: -14mm; bottom: -14mm; width: 43mm; height: 25mm; background: #17131b; content: ""; }
    .cover small, .cover h1, .cover h2, .cover p { position: relative; z-index: 1; }
    .cover small { color: #bdb5c2; font-weight: 800; letter-spacing: .16em; }
    .cover h1 { margin: 18mm 0 4mm; font-size: 34pt; }
    .cover h2 { width: 112mm; margin: 0; color: #d8d1dd; font-size: 16pt; font-weight: 500; line-height: 1.55; }
    .cover p { position: absolute; bottom: 35mm; left: 20mm; width: 150mm; padding: 10mm; border: 1px solid #403648; border-radius: 5mm; background: #251f2a; font-size: 13pt; line-height: 1.8; }
    .page { padding: 10mm 13mm 9mm; border-top: 2mm solid #6d3bd1; }
    .page > header, .page > footer { display: flex; justify-content: space-between; color: #736d78; font-size: 7pt; }
    .page > header { height: 9mm; }
    .page > footer { height: 7mm; padding-top: 3mm; border-top: .2mm solid #ddd8e2; }
    .page main { height: 267mm; }
    .page main.one-image { display: grid; grid-template-columns: 1fr 82mm; gap: 9mm; align-items: start; }
    .page main.two-images { display: grid; grid-template-rows: auto 1fr; gap: 6mm; }
    .page main.history-page { display: block; padding: 10mm 8mm; }
    .history-page .copy { max-width: 155mm; margin: 0 auto; }
    .history-page ul { display: grid; gap: 4mm; padding: 0; list-style: none; }
    .history-page li { padding: 6mm 7mm; border-left: 1.5mm solid #6d3bd1; border-radius: 0 3mm 3mm 0; background: #f5f1fb; font-size: 11pt; line-height: 1.7; }
    .kicker { margin: 5mm 0 2mm; color: #6d3bd1; font-size: 8pt; font-weight: 700; }
    h1 { margin: 0 0 6mm; font-size: 22pt; }
    ul { margin: 0; padding-left: 6mm; font-size: 11pt; line-height: 1.8; }
    li { margin-bottom: 3mm; }
    aside { margin-top: 8mm; padding: 5mm; border: .3mm solid #cbb8ef; border-radius: 3mm; background: #f3edff; font-size: 8.5pt; line-height: 1.7; }
    .visuals { display: flex; justify-content: center; gap: 7mm; min-height: 0; }
    .one-image .visuals { padding-top: 7mm; }
    .visuals img { object-fit: cover; object-position: top; border: .35mm solid #d5d1d7; border-radius: 5mm; box-shadow: 0 2mm 5mm #0002; }
    .one-image .visuals img { width: 78mm; height: 169mm; }
    .two-images .visuals img { width: 69mm; height: 149mm; }
  </style></head><body><section class="cover"><i class="cover-mark" aria-hidden="true"></i><small>CLAY SHOOTING ANALYSIS</small><h1>Shoot Log</h1><h2>${english ? "Smartphone Operation Manual" : "スマートフォン操作マニュアル"}　Version ${VERSION}</h2><p>${english ? "Actual app screens are shown at a readable size for each task. Long screens are automatically scrolled to the relevant section and captured separately." : "実際の画面を、操作ごとに読みやすい大きさで掲載しています。長い画面は必要な位置へ自動スクロールして分割撮影しています。"}</p></section>${pages.join("")}</body></html>`;
}

await mkdir(screenshotDir, { recursive: true });
const vite = await createServer({ root: appRoot, logLevel: "error", server: { host: "127.0.0.1", port: 0 } });
let browser;
try {
  await vite.listen();
  const address = vite.httpServer.address();
  if (!address || typeof address === "string") throw new Error("撮影用サーバーを起動できませんでした。");
  const origin = `http://127.0.0.1:${address.port}`;
  browser = await puppeteer.launch({ executablePath, headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const page = await browser.newPage();
  page.on("pageerror", (error) => process.stderr.write(`撮影画面エラー: ${error.message}\n`));
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);

  if (!pdfOnly) {
    for (const capture of captures) {
      await page.goto(`${origin}/manual-preview.html?scene=${capture.scene}${english ? "&lang=en" : ""}`, { waitUntil: "networkidle0" });
      try {
        await page.waitForSelector(capture.selector, { visible: true, timeout: 10_000 });
      } catch (error) {
        throw new Error(`撮影 ${capture.name}（${capture.selector}）を表示できませんでした。`, { cause: error });
      }
      await page.evaluate(async (selector) => {
        await document.fonts.ready;
        const element = document.querySelector(selector);
        element?.scrollIntoView({ block: "start" });
        window.scrollBy(0, -12);
      }, capture.selector);
      await page.screenshot({ path: join(screenshotDir, `${capture.name}.png`), type: "png" });
      process.stdout.write(`撮影: ${capture.name}\n`);
    }

    const roundSetupImage = await readFile(join(screenshotDir, "08-round-setup.png"));
    const currentShotImage = await readFile(join(screenshotDir, "09-current-shot.png"));
    if (roundSetupImage.equals(currentShotImage)) throw new Error("ラウンド準備と結果入力の画像が同一です。");

    await writeFile(join(screenshotDir, "manifest.json"), JSON.stringify({ version: VERSION, viewport: { width: 390, height: 844, deviceScaleFactor: 2 }, captures }, null, 2));
  }

  if (english) process.stdout.write(`英語画面の撮影完了: ${screenshotDir}\n`);
  {
    const manualPage = await browser.newPage();
    await manualPage.setContent(await buildManualHtml(), { waitUntil: "domcontentloaded", timeout: 0 });
    await manualPage.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(Array.from(document.images).map((item) => item.complete
        ? Promise.resolve()
        : new Promise((resolveImage, rejectImage) => {
            item.addEventListener("load", resolveImage, { once: true });
            item.addEventListener("error", rejectImage, { once: true });
          })));
    });
    await manualPage.pdf({ path: manualOutput, format: "A4", printBackground: true, preferCSSPageSize: true });
    process.stdout.write(`マニュアル生成: ${manualOutput}\n`);
  }
} finally {
  if (browser) await browser.close();
  await vite.close();
}
