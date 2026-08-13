/* eslint-disable react-refresh/only-export-components -- Vite-only manual capture entry renders its scenes directly. */
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { LanguageProvider } from "./i18n/LanguageContext";
import "./index.css";
import "./App.css";
import "./components/AppShell.css";
import { AccountSettings } from "./components/AccountSettings";
import { AmmunitionLedger } from "./components/AmmunitionLedger";
import ContactSupport from "./components/ContactSupport";
import { DataManagement } from "./components/DataManagement";
import { HistoryAnalysis } from "./components/HistoryAnalysis";
import { MasterDataManager } from "./components/MasterDataManager";
import { PermitManager } from "./components/PermitManager";
import { PracticeThemeBanner } from "./components/PracticeThemeBanner";
import { RoundInput } from "./components/RoundInput";
import { SessionAnalysis } from "./components/SessionAnalysis";
import { SessionForm } from "./components/SessionForm";
import { SessionList } from "./components/SessionList";
import type { AmmunitionLedgerData, Firearm } from "./domain/ammunition";
import type { FinalResult, ShootingRound } from "./domain/shooting";
import { createEmptySkeetRound } from "./domain/shooting";
import { calculateSessionStats } from "./domain/shootingStats";
import type { CloudHealthView, CloudSyncView } from "./hooks/useCloudSync";
import type { StoredSession } from "./services/storage";

const noop = () => undefined;
const asyncNoop = async () => undefined;
const previewEnglish = new URLSearchParams(window.location.search).get("lang") === "en";
const sample = (ja: string, en: string) => previewEnglish ? en : ja;
const masterData = { rangeNames: [sample("大井射撃場", "Sample Clay Range"), sample("県立射撃場", "Regional Shooting Range")], ammunitionNames: ["Sample 7.5", "Practice 24g"] };

const firearm: Firearm = {
  id: "demo-firearm",
  name: sample("サンプル上下二連", "Sample Over-and-Under"),
  identifier: "DEMO-001",
  originalPermitDate: "2024-04-01",
  originalPermitNumber: sample("説明用", "DEMO"),
  permitDate: "2024-04-01",
  permitNumber: sample("説明用", "DEMO"),
  inspectionDate: "2024-04-01",
  validUntil: "2027-03-31",
  renewalStartDate: "2026-10-01",
  renewalDeadline: "2027-02-28",
  kind: sample("散弾銃", "Shotgun"),
  actionType: sample("上下二連", "Over-and-under"),
  manufacturer: sample("サンプル", "Sample"),
  model: "Trap AC",
  overallLength: "116.0",
  barrelLength: "76.0",
  caliber: sample("12番", "12 gauge"),
  magazine: sample("2発", "2 shells"),
  compatibleAmmo: sample("12番散弾実包", "12-gauge shotshell"),
  purpose: sample("標的射撃", "Target shooting"),
};

function createRound(roundNo: number, results: FinalResult[]): ShootingRound {
  return {
    id: `demo-round-${roundNo}`,
    roundNo,
    startStandNo: 1,
    fireMode: "double",
    shots: Array.from({ length: 25 }, (_, index) => {
      const finalResult = results[index % results.length];
      return {
        id: `demo-shot-${roundNo}-${index + 1}`,
        targetNo: index + 1,
        standNo: ((index % 5) + 1) as 1 | 2 | 3 | 4 | 5,
        firstShotResult: finalResult === "hit-on-first" ? "hit" as const : "miss" as const,
        secondShotResult: finalResult === "hit-on-second" ? "hit" as const : finalResult === "miss" ? "miss" as const : "not-fired" as const,
        finalResult,
        ...(finalResult === "miss" ? { missDirection: (["left", "center", "right"] as const)[index % 3] } : {}),
      };
    }),
  };
}

function createEmptyRound(roundNo: number): ShootingRound {
  return {
    id: `demo-empty-round-${roundNo}`,
    roundNo,
    startStandNo: 1,
    fireMode: "double",
    shots: Array.from({ length: 25 }, (_, index) => ({
      id: `demo-empty-shot-${roundNo}-${index + 1}`,
      targetNo: index + 1,
      standNo: ((index % 5) + 1) as 1 | 2 | 3 | 4 | 5,
      firstShotResult: "not-fired" as const,
      secondShotResult: "not-fired" as const,
      finalResult: "skip" as const,
    })),
  };
}

function createPartiallyEnteredRound(roundNo: number): ShootingRound {
  const entered = createRound(roundNo, ["hit-on-first", "hit-on-second", "hit-on-first", "miss"]);
  return {
    ...entered,
    shots: entered.shots.map((shot, index) => index === 10 ? {
      ...shot,
      firstShotResult: "hit" as const,
      secondShotResult: "not-fired" as const,
      secondShotFiredAfterFirstHit: true,
      finalResult: "hit-on-first" as const,
      missDirection: undefined,
    } : index < 12 ? shot : {
      ...shot,
      firstShotResult: "not-fired" as const,
      secondShotResult: "not-fired" as const,
      finalResult: "skip" as const,
      missDirection: undefined,
    }),
  };
}

const rounds = [
  createRound(1, ["hit-on-first", "hit-on-first", "miss", "hit-on-second"]),
  createRound(2, ["hit-on-first", "hit-on-second", "hit-on-first", "miss", "hit-on-first"]),
  createRound(3, ["hit-on-first", "miss", "hit-on-second", "hit-on-first"]),
  createRound(4, ["hit-on-first", "hit-on-first", "hit-on-second", "miss", "hit-on-first"]),
];

const session: StoredSession = {
  id: "demo-session",
  session: {
    date: "2026-07-20",
    rangeName: sample("大井射撃場", "Sample Clay Range"),
    discipline: "trap",
    ammunitionName: "Sample 7.5",
    firearmId: firearm.id,
    practiceTheme: sample("クレーを見てから動く", "See the target before moving"),
    weather: sample("薄曇り", "Partly cloudy"),
    temperature: "24",
    windDirection: sample("左から", "From left"),
    windStrength: sample("弱い", "Light"),
    memo: sample("説明用データ", "Fictional sample data"),
  },
  rounds,
  review: {
    findings: sample("後半は焦らず、クレーを見てから動けた。", "In the second half, I stayed calm and saw the target before moving."),
    problems: sample("右方向のクレーで動き始めが早くなることがあった。", "I sometimes moved too early on right-going targets."),
    nextChallenge: sample("呼吸を整え、クレーを確認してから動く。", "Settle my breathing and confirm the target before moving."),
    themeAchievement: "partial",
  },
  status: "completed",
  createdAt: "2026-07-20T06:00:00.000Z",
  updatedAt: "2026-07-20T06:30:00.000Z",
};

const earlierSessions: StoredSession[] = [0, 1, 2].map((index) => ({
  ...session,
  id: `demo-session-${index}`,
  session: { ...session.session, date: `2026-07-${String(6 + index * 7).padStart(2, "0")}` },
  review: { ...session.review, themeAchievement: index === 2 ? "achieved" : "partial" },
  rounds: rounds.slice(0, 2).map((round, roundIndex) => ({ ...round, id: `${round.id}-${index}`, roundNo: roundIndex + 1 })),
}));
const sessions = [session, ...earlierSessions];

const initialLedger: AmmunitionLedgerData = {
  trackingStartDate: "2026-07-01",
  permitProfile: { certificateNumber: sample("（説明用）", "DEMO"), originalIssueDate: "2024-04-01", issueDate: "2024-04-01" },
  categories: [{ id: "trap-shell", name: sample("12番・散", "12 gauge / shot"), family: "shot-shell" }],
  firearms: [firearm],
  productLinks: [{ ammunitionName: "Sample 7.5", categoryId: "trap-shell" }],
  entries: [
    { id: "opening", date: "2026-07-01", type: "opening", categoryId: "trap-shell", quantity: 500, application: sample("開始残弾（説明用）", "Opening balance (sample)"), createdAt: "2026-07-01T00:00:00.000Z" },
    { id: "purchase", date: "2026-07-10", type: "acquisition", categoryId: "trap-shell", quantity: 250, firearmId: firearm.id, application: sample("サンプル銃砲店", "Sample Gun Shop"), createdAt: "2026-07-10T00:00:00.000Z" },
  ],
};

const cloud: CloudSyncView = { phase: "synced", email: "demo@example.com", message: sample("クラウドと同期されています。", "Synced with cloud."), lastSyncedAt: "2026-07-20T06:30:00.000Z", pendingChanges: 0 };
const signedOutCloud: CloudSyncView = { phase: "signed-out", email: "", message: "", lastSyncedAt: "", pendingChanges: 0 };
const health: CloudHealthView = { status: "healthy", message: sample("クラウドへ接続できます。", "Cloud connection is available."), lastCheckedAt: "2026-07-20T06:30:00.000Z", lastHealthyAt: "2026-07-20T06:30:00.000Z" };

function AppHeader() {
  return <header className="app-header"><div><p className="eyebrow">CLAY SHOOTING ANALYSIS</p><h1><img aria-hidden="true" alt="" src={`${import.meta.env.BASE_URL}favicon.svg`} />Shoot Log</h1></div><p className="version">Version 2.25.1</p></header>;
}

function RoundScene({ state }: { state: "before" | "after" }) {
  const sceneRounds = state === "before"
    ? [1, 2, 3, 4].map(createEmptyRound)
    : [createPartiallyEnteredRound(1), createEmptyRound(2), createEmptyRound(3), createEmptyRound(4)];
  const [activeRound, setActiveRound] = useState(sceneRounds[0]);
  const stats = calculateSessionStats({ id: session.id, date: session.session.date, rangeName: session.session.rangeName, ammunitionName: session.session.ammunitionName, weather: session.session.weather, rounds: sceneRounds, sessionMemo: session.session.memo });
  return <>
    <section className="session-summary"><div><strong>{session.session.date}</strong><span>{session.session.rangeName}</span></div><div><span>{sample("TRAP ・ 4ラウンド", "TRAP · 4 rounds")}</span><strong>{stats.score} / {stats.targets} {sample(`実包 ${stats.cartridgesUsed}発`, `${stats.cartridgesUsed} shells`)}</strong><span>{session.session.ammunitionName}</span></div><div className="session-actions"><button>{sample("基本情報を編集", "Edit details")}</button><button>{sample("履歴へ戻る", "Back to history")}</button><button className="complete-button">{sample("セッション完了", "Complete session")}</button></div></section>
    <PracticeThemeBanner theme={session.session.practiceTheme ?? ""} />
    <div className="round-navigation round-navigation-stacked"><nav className="round-tabs" aria-label={sample("ラウンド選択", "Round selection")}>{sceneRounds.map((round) => <button className={round.id === activeRound.id ? "selected" : ""} key={round.id} onClick={() => setActiveRound(round)}>Round {round.roundNo}</button>)}</nav><div className="round-actions"><button className="delete-round-button">{sample(`Round ${activeRound.roundNo} 削除`, `Delete Round ${activeRound.roundNo}`)}</button></div></div>
    <RoundInput key={activeRound.id} round={activeRound} onChange={setActiveRound} />
  </>;
}

function ManualPreview() {
  const [ledger, setLedger] = useState(initialLedger);
  const params = new URLSearchParams(window.location.search);
  const scene = params.get("scene") ?? "history";
  const openAi = params.get("openAi") === "1";
  let content;

  if (scene === "login") content = <AccountSettings cloud={signedOutCloud} health={health} passwordRecovery={false} firearms={[]} isAdmin={false} onAdmin={noop} onBack={noop} onPrivacy={noop} onTerms={noop} onContact={noop} onSignIn={asyncNoop} onSignUp={async () => ""} onSignOut={asyncNoop} onSendPasswordReset={asyncNoop} onChangePassword={asyncNoop} onCompletePasswordRecovery={asyncNoop} onSync={asyncNoop} onCheckHealth={asyncNoop} onDeleteAccount={asyncNoop} onPermit={noop} />;
  else if (scene === "account") content = <AccountSettings cloud={cloud} health={health} passwordRecovery={false} firearms={[firearm]} isAdmin={false} onAdmin={noop} onBack={noop} onPrivacy={noop} onTerms={noop} onContact={noop} onSignIn={asyncNoop} onSignUp={async () => ""} onSignOut={asyncNoop} onSendPasswordReset={asyncNoop} onChangePassword={asyncNoop} onCompletePasswordRecovery={asyncNoop} onSync={asyncNoop} onCheckHealth={asyncNoop} onDeleteAccount={asyncNoop} onPermit={noop} />;
  else if (scene === "history") content = <SessionList sessions={sessions} firearms={[firearm]} suggestedPracticeTheme={sample("クレーを見てから動く", "See the target before moving")} onCreate={noop} onManage={noop} onData={noop} onAccount={noop} onAmmunition={noop} onOpen={noop} onDelete={noop} />;
  else if (scene === "history-analysis") content = <HistoryAnalysis sessions={sessions} />;
  else if (scene === "form") content = <SessionForm initialValue={session.session} rangeNames={masterData.rangeNames} ammunitionNames={masterData.ammunitionNames} firearms={[firearm]} onCancel={noop} onStart={noop} />;
  else if (scene === "round-before") content = <RoundScene state="before" />;
  else if (scene === "round-after") content = <RoundScene state="after" />;
  else if (scene === "skeet") content = <RoundInput round={createEmptySkeetRound(1)} discipline="skeet" onChange={noop} />;
  else if (scene === "analysis") content = <SessionAnalysis session={session} reviewAdvice={null} aiInitiallyOpen={openAi} onBack={noop} onResume={noop} onEdit={noop} onSaveReview={noop} />;
  else if (scene === "master") content = <MasterDataManager masterData={masterData} onBack={noop} onAdd={noop} onRename={noop} onDelete={noop} />;
  else if (scene === "ledger") content = <AmmunitionLedger data={ledger} sessions={sessions} ammunitionNames={masterData.ammunitionNames} onChange={setLedger} onBack={noop} />;
  else if (scene === "permit") content = <PermitManager data={ledger} onChange={setLedger} onBack={noop} backLabel={sample("アカウント設定へ戻る", "Back to account settings")} />;
  else if (scene === "support") content = <ContactSupport onBack={noop} />;
  else content = <DataManagement sessions={sessions} masterData={masterData} ammunitionLedger={ledger} onBack={noop} onImport={noop} />;

  return <main className="app-shell manual-preview"><AppHeader />{content}</main>;
}

const previewLanguage = new URLSearchParams(window.location.search).get("lang");
if (previewLanguage === "ja" || previewLanguage === "en") localStorage.setItem("shoot-log-language", previewLanguage);
createRoot(document.getElementById("root")!).render(<LanguageProvider><ManualPreview /></LanguageProvider>);
