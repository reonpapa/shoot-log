/* eslint-disable react-refresh/only-export-components -- Vite-only manual capture entry renders its scenes directly. */
import { useState } from "react";
import { createRoot } from "react-dom/client";
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
import { calculateSessionStats } from "./domain/shootingStats";
import type { CloudHealthView, CloudSyncView } from "./hooks/useCloudSync";
import type { StoredSession } from "./services/storage";

const noop = () => undefined;
const asyncNoop = async () => undefined;
const masterData = { rangeNames: ["大井射撃場", "県立射撃場"], ammunitionNames: ["Sample 7.5", "Practice 24g"] };

const firearm: Firearm = {
  id: "demo-firearm",
  name: "サンプル上下二連",
  identifier: "DEMO-001",
  originalPermitDate: "2024-04-01",
  originalPermitNumber: "説明用",
  permitDate: "2024-04-01",
  permitNumber: "説明用",
  inspectionDate: "2024-04-01",
  validUntil: "2027-03-31",
  renewalStartDate: "2026-10-01",
  renewalDeadline: "2027-02-28",
  kind: "散弾銃",
  actionType: "上下二連",
  manufacturer: "サンプル",
  model: "Trap AC",
  overallLength: "116.0",
  barrelLength: "76.0",
  caliber: "12番",
  magazine: "2発",
  compatibleAmmo: "12番散弾実包",
  purpose: "標的射撃",
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
    rangeName: "大井射撃場",
    discipline: "trap",
    ammunitionName: "Sample 7.5",
    firearmId: firearm.id,
    practiceTheme: "クレーを見てから動く",
    weather: "薄曇り",
    temperature: "24",
    windDirection: "左から",
    windStrength: "弱い",
    memo: "説明用データ",
  },
  rounds,
  review: {
    findings: "後半は焦らず、クレーを見てから動けた。",
    problems: "右方向のクレーで動き始めが早くなることがあった。",
    nextChallenge: "呼吸を整え、クレーを確認してから動く。",
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
  permitProfile: { certificateNumber: "（説明用）", originalIssueDate: "2024-04-01", issueDate: "2024-04-01" },
  categories: [{ id: "trap-shell", name: "12番・散", family: "shot-shell" }],
  firearms: [firearm],
  productLinks: [{ ammunitionName: "Sample 7.5", categoryId: "trap-shell" }],
  entries: [
    { id: "opening", date: "2026-07-01", type: "opening", categoryId: "trap-shell", quantity: 500, application: "開始残弾（説明用）", createdAt: "2026-07-01T00:00:00.000Z" },
    { id: "purchase", date: "2026-07-10", type: "acquisition", categoryId: "trap-shell", quantity: 250, firearmId: firearm.id, application: "サンプル銃砲店", createdAt: "2026-07-10T00:00:00.000Z" },
  ],
};

const cloud: CloudSyncView = { phase: "synced", email: "demo@example.com", message: "クラウドと同期されています。", lastSyncedAt: "2026-07-20T06:30:00.000Z", pendingChanges: 0 };
const signedOutCloud: CloudSyncView = { phase: "signed-out", email: "", message: "", lastSyncedAt: "", pendingChanges: 0 };
const health: CloudHealthView = { status: "healthy", message: "クラウドへ接続できます。", lastCheckedAt: "2026-07-20T06:30:00.000Z", lastHealthyAt: "2026-07-20T06:30:00.000Z" };

function AppHeader() {
  return <header className="app-header"><div><p className="eyebrow">CLAY SHOOTING ANALYSIS</p><h1><img aria-hidden="true" alt="" src={`${import.meta.env.BASE_URL}favicon.svg`} />Shoot Log</h1></div><p className="version">Version 2.19.8</p></header>;
}

function RoundScene() {
  const [activeRound, setActiveRound] = useState(rounds[0]);
  const stats = calculateSessionStats({ id: session.id, date: session.session.date, rangeName: session.session.rangeName, ammunitionName: session.session.ammunitionName, weather: session.session.weather, rounds, sessionMemo: session.session.memo });
  return <>
    <section className="session-summary"><div><strong>{session.session.date}</strong><span>{session.session.rangeName}</span></div><div><span>TRAP ・ 4ラウンド</span><strong>{stats.score} / {stats.targets}　実包 {stats.cartridgesUsed}発</strong><span>{session.session.ammunitionName}</span></div><div className="session-actions"><button>基本情報を編集</button><button>履歴へ戻る</button><button className="complete-button">セッション完了</button></div></section>
    <PracticeThemeBanner theme={session.session.practiceTheme ?? ""} />
    <div className="round-navigation round-navigation-stacked"><nav className="round-tabs" aria-label="ラウンド選択">{rounds.map((round) => <button className={round.id === activeRound.id ? "selected" : ""} key={round.id} onClick={() => setActiveRound(round)}>Round {round.roundNo}</button>)}</nav><div className="round-actions"><button className="delete-round-button">Round {activeRound.roundNo} 削除</button></div></div>
    <RoundInput key={activeRound.id} round={activeRound} onChange={setActiveRound} />
  </>;
}

function ManualPreview() {
  const [ledger, setLedger] = useState(initialLedger);
  const params = new URLSearchParams(window.location.search);
  const scene = params.get("scene") ?? "history";
  const openAi = params.get("openAi") === "1";
  let content;

  if (scene === "login") content = <AccountSettings cloud={signedOutCloud} health={health} passwordRecovery={false} firearms={[]} onBack={noop} onPrivacy={noop} onTerms={noop} onContact={noop} onSignIn={asyncNoop} onSignUp={async () => ""} onSignOut={asyncNoop} onSendPasswordReset={asyncNoop} onChangePassword={asyncNoop} onCompletePasswordRecovery={asyncNoop} onSync={asyncNoop} onCheckHealth={asyncNoop} onDeleteAccount={asyncNoop} onPermit={noop} />;
  else if (scene === "account") content = <AccountSettings cloud={cloud} health={health} passwordRecovery={false} firearms={[firearm]} onBack={noop} onPrivacy={noop} onTerms={noop} onContact={noop} onSignIn={asyncNoop} onSignUp={async () => ""} onSignOut={asyncNoop} onSendPasswordReset={asyncNoop} onChangePassword={asyncNoop} onCompletePasswordRecovery={asyncNoop} onSync={asyncNoop} onCheckHealth={asyncNoop} onDeleteAccount={asyncNoop} onPermit={noop} />;
  else if (scene === "history") content = <SessionList sessions={sessions} firearms={[firearm]} suggestedPracticeTheme="クレーを見てから動く" onCreate={noop} onManage={noop} onData={noop} onAccount={noop} onAmmunition={noop} onOpen={noop} onDelete={noop} />;
  else if (scene === "history-analysis") content = <HistoryAnalysis sessions={sessions} />;
  else if (scene === "form") content = <SessionForm initialValue={session.session} rangeNames={masterData.rangeNames} ammunitionNames={masterData.ammunitionNames} firearms={[firearm]} onCancel={noop} onStart={noop} />;
  else if (scene === "round") content = <RoundScene />;
  else if (scene === "analysis") content = <SessionAnalysis session={session} reviewAdvice={null} aiInitiallyOpen={openAi} onBack={noop} onResume={noop} onEdit={noop} onSaveReview={noop} />;
  else if (scene === "master") content = <MasterDataManager masterData={masterData} onBack={noop} onAdd={noop} onRename={noop} onDelete={noop} />;
  else if (scene === "ledger") content = <AmmunitionLedger data={ledger} sessions={sessions} ammunitionNames={masterData.ammunitionNames} onChange={setLedger} onBack={noop} />;
  else if (scene === "permit") content = <PermitManager data={ledger} onChange={setLedger} onBack={noop} backLabel="アカウント設定へ戻る" />;
  else if (scene === "support") content = <ContactSupport onBack={noop} />;
  else content = <DataManagement sessions={sessions} masterData={masterData} ammunitionLedger={ledger} onBack={noop} onImport={noop} />;

  return <main className="app-shell manual-preview"><AppHeader />{content}</main>;
}

createRoot(document.getElementById("root")!).render(<ManualPreview />);
