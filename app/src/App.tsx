import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";
import "./components/AppShell.css";
import { RoundInput } from "./components/RoundInput";
import { SessionForm, type SessionDraft } from "./components/SessionForm";
import { SessionList } from "./components/SessionList";
import { SessionAnalysis } from "./components/SessionAnalysis";
import { HistoryAnalysis } from "./components/HistoryAnalysis";
import { MasterDataManager, type MasterKind } from "./components/MasterDataManager";
import { DataManagement } from "./components/DataManagement";
import { AccountSettings } from "./components/AccountSettings";
import { PermitCountdown } from "./components/PermitCountdown";
import { PermitChangeAlert } from "./components/PermitChangeAlert";
import { PermitManager } from "./components/PermitManager";
import { PwaStatus } from "./components/PwaStatus";
import { CloudSyncStatus } from "./components/CloudSyncStatus";
import { PracticeThemeBanner } from "./components/PracticeThemeBanner";
import { createEmptyRound, type ShootingRound } from "./domain/shooting";
import type { SessionReview } from "./domain/shooting";
import { calculateSessionStats } from "./domain/shootingStats";
import { loadSessions, saveSessions, type StoredSession } from "./services/storage";
import { addSessionToMasterData, loadMasterData, saveMasterData, type MasterData } from "./services/masterData";
import { mergeMasterData, mergeSessions, type ShootLogBackup } from "./services/backup";
import { loadAmmunitionLedger, mergeAmmunitionLedger, saveAmmunitionLedger } from "./services/ammunitionLedger";
import type { AmmunitionLedgerData } from "./domain/ammunition";
import { useCloudSync } from "./hooks/useCloudSync";
import type { LocalDataSet } from "./services/cloudSync";
import { getPracticeRecommendation, getScoreBasedPracticeRecommendation } from "./services/sessionPlanning";

type Screen = "list" | "form" | "round" | "analysis" | "edit-session" | "master" | "data" | "account" | "privacy" | "terms" | "contact" | "ammunition" | "permit";
const MAX_ROUNDS = 4;
const PrivacyPolicy = lazy(() => import("./components/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./components/TermsOfService"));
const ContactSupport = lazy(() => import("./components/ContactSupport"));
const AmmunitionLedger = lazy(() => import("./components/AmmunitionLedger").then((module) => ({ default: module.AmmunitionLedger })));

function App() {
  const [sessions, setSessions] = useState<StoredSession[]>(loadSessions);
  const [masterData, setMasterData] = useState<MasterData>(() => loadSessions().reduce((result, item) => addSessionToMasterData(result, item.session), loadMasterData()));
  const [ammunitionLedger, setAmmunitionLedger] = useState<AmmunitionLedgerData>(loadAmmunitionLedger);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeRoundId, setActiveRoundId] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>("list");
  const [permitReturnScreen, setPermitReturnScreen] = useState<"list" | "account">("list");
  const applyCloudData = useCallback((data: LocalDataSet) => {
    setSessions(data.sessions);
    setMasterData(data.masterData);
    setAmmunitionLedger(data.ammunitionLedger);
  }, []);
  const cloudSync = useCloudSync({ sessions, masterData, ammunitionLedger, onApplyCloudData: applyCloudData });
  const activeSession = useMemo(() => sessions.find((item) => item.id === activeSessionId) ?? null, [sessions, activeSessionId]);
  const activeRound = activeSession?.rounds.find((round) => round.id === activeRoundId) ?? activeSession?.rounds[0] ?? null;
  const activeStats = activeSession ? calculateSessionStats({ id: activeSession.id, date: activeSession.session.date, rangeName: activeSession.session.rangeName, ammunitionName: activeSession.session.ammunitionName, weather: activeSession.session.weather, rounds: activeSession.rounds, sessionMemo: activeSession.session.memo }) : null;
  const practiceRecommendation = useMemo(() => getPracticeRecommendation(sessions), [sessions]);
  const reviewAdvice = useMemo(() => activeSession ? getScoreBasedPracticeRecommendation([activeSession]) : null, [activeSession]);
  const suggestedPracticeTheme = practiceRecommendation?.theme ?? "";
  const signedIn = cloudSync.view.phase !== "signed-out" && !!cloudSync.view.email;
  const publicScreen = screen === "privacy" || screen === "terms" || screen === "contact";
  const displayedScreen: Screen = cloudSync.passwordRecovery || (!signedIn && !publicScreen) ? "account" : screen;

  useEffect(() => saveSessions(sessions), [sessions]);
  useEffect(() => saveMasterData(masterData), [masterData]);
  useEffect(() => saveAmmunitionLedger(ammunitionLedger), [ammunitionLedger]);
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [displayedScreen]);
  function startSession(details: SessionDraft) {
    const now = new Date().toISOString();
    const firstRound = createEmptyRound(1);
    const next: StoredSession = { id: crypto.randomUUID(), session: details, rounds: [firstRound], review: { findings: "", problems: "", nextChallenge: "" }, status: "draft", createdAt: now, updatedAt: now };
    setSessions((current) => [next, ...current]); setActiveSessionId(next.id); setActiveRoundId(firstRound.id); setScreen("round");
    setMasterData((current) => addSessionToMasterData(current, details));
  }
  function openSession(id: string) {
    const found = sessions.find((item) => item.id === id); if (!found) return;
    setActiveSessionId(id); setActiveRoundId(found.rounds[0]?.id ?? null); setScreen(found.status === "completed" ? "analysis" : "round");
  }
  function updateActive(changes: (session: StoredSession) => StoredSession) {
    if (!activeSessionId) return;
    setSessions((current) => current.map((item) => item.id === activeSessionId ? { ...changes(item), status: "draft", updatedAt: new Date().toISOString() } : item));
  }
  function updateRound(round: ShootingRound) { updateActive((session) => ({ ...session, rounds: session.rounds.map((item) => item.id === round.id ? round : item) })); }
  function addRound() {
    if (!activeSession || activeSession.rounds.length >= MAX_ROUNDS) return;
    const round = createEmptyRound(activeSession.rounds.length + 1);
    updateActive((session) => ({ ...session, rounds: [...session.rounds, round] })); setActiveRoundId(round.id);
  }
  function deleteActiveRound() {
    if (!activeSession || !activeRound || activeSession.rounds.length <= 1) return;
    if (!window.confirm(`Round ${activeRound.roundNo} を削除しますか？\nこのラウンドの入力内容は元に戻せません。`)) return;
    const deletedIndex = activeSession.rounds.findIndex((round) => round.id === activeRound.id);
    const nextRounds = activeSession.rounds
      .filter((round) => round.id !== activeRound.id)
      .map((round, index) => ({ ...round, roundNo: index + 1 }));
    const nextActiveRound = nextRounds[Math.min(deletedIndex, nextRounds.length - 1)];
    updateActive((session) => ({ ...session, rounds: nextRounds }));
    setActiveRoundId(nextActiveRound.id);
  }
  function completeSession() {
    if (!activeSessionId || !activeSession) return;
    const enteredRounds = activeSession.rounds.filter((round) => round.shots.some((shot) => shot.finalResult !== "skip"));
    if (enteredRounds.length === 0) {
      window.alert("完了できるラウンドがありません。");
      return;
    }
    const incompleteRound = enteredRounds.find((round) => round.shots.some((shot) => shot.finalResult === "skip"));
    if (incompleteRound) {
      window.alert(`Round ${incompleteRound.roundNo} に未入力があります。`);
      setActiveRoundId(incompleteRound.id);
      return;
    }
    const completedRounds = enteredRounds.map((round, index) => ({ ...round, roundNo: index + 1 }));
    setSessions((current) => current.map((item) => item.id === activeSessionId ? { ...item, rounds: completedRounds, status: "completed", updatedAt: new Date().toISOString() } : item));
    setScreen("analysis");
  }
  function resumeSession() {
    if (!activeSessionId || !activeSession) return;
    setSessions((current) => current.map((item) => item.id === activeSessionId ? { ...item, status: "draft", updatedAt: new Date().toISOString() } : item));
    setActiveRoundId(activeSession.rounds[0]?.id ?? null);
    setScreen("round");
  }
  function editSessionDetails(details: SessionDraft) {
    if (!activeSessionId || !activeSession) return;
    const returnScreen: Screen = activeSession.status === "completed" ? "analysis" : "round";
    setSessions((current) => current.map((item) => item.id === activeSessionId ? { ...item, session: details, updatedAt: new Date().toISOString() } : item));
    setMasterData((current) => addSessionToMasterData(current, details));
    setScreen(returnScreen);
  }
  function addMasterValue(kind: MasterKind, value: string) {
    setMasterData((current) => kind === "range"
      ? { ...current, rangeNames: [...new Set([...current.rangeNames, value])].sort((a, b) => a.localeCompare(b, "ja")) }
      : { ...current, ammunitionNames: [...new Set([...current.ammunitionNames, value])].sort((a, b) => a.localeCompare(b, "ja")) });
  }
  function renameMasterValue(kind: MasterKind, oldValue: string, newValue: string) {
    if (oldValue === newValue) return;
    setMasterData((current) => kind === "range"
      ? { ...current, rangeNames: [...new Set(current.rangeNames.map((value) => value === oldValue ? newValue : value))].sort((a, b) => a.localeCompare(b, "ja")) }
      : { ...current, ammunitionNames: [...new Set(current.ammunitionNames.map((value) => value === oldValue ? newValue : value))].sort((a, b) => a.localeCompare(b, "ja")) });
    setSessions((current) => current.map((item) => ({ ...item, session: { ...item.session, ...(kind === "range" && item.session.rangeName === oldValue ? { rangeName: newValue } : {}), ...(kind === "ammunition" && item.session.ammunitionName === oldValue ? { ammunitionName: newValue } : {}) } })));
    if (kind === "ammunition") setAmmunitionLedger((current) => ({ ...current, productLinks: current.productLinks.map((item) => item.ammunitionName === oldValue ? { ...item, ammunitionName: newValue } : item) }));
  }
  function deleteMasterValue(kind: MasterKind, value: string) {
    if (!window.confirm(`${value}を今後の選択肢から削除しますか？\n過去の履歴は変更されません。`)) return;
    setMasterData((current) => kind === "range"
      ? { ...current, rangeNames: current.rangeNames.filter((item) => item !== value) }
      : { ...current, ammunitionNames: current.ammunitionNames.filter((item) => item !== value) });
  }
  function importBackup(backup: ShootLogBackup) {
    setSessions((current) => mergeSessions(current, backup.sessions));
    setMasterData((current) => mergeMasterData(current, backup.masterData));
    setAmmunitionLedger((current) => mergeAmmunitionLedger(current, backup.ammunitionLedger));
  }
  function saveReview(review: SessionReview) {
    if (!activeSessionId) return;
    setSessions((current) => current.map((item) => item.id === activeSessionId ? { ...item, review, updatedAt: new Date().toISOString() } : item));
  }
  function deleteSession(id: string) {
    const item = sessions.find((session) => session.id === id);
    if (item && window.confirm(`${item.session.date}の記録を削除しますか？${item.status === "completed" ? "\n実包台帳の自動消費行も削除され、残弾が再計算されます。" : ""}`)) {
      cloudSync.recordSessionDeletion(id);
      setSessions((current) => current.filter((session) => session.id !== id));
    }
  }
  function returnToList() { setActiveSessionId(null); setActiveRoundId(null); setScreen("list"); }
  async function signIn(email: string, password: string) {
    await cloudSync.signIn(email, password);
    setScreen("list");
  }
  async function signOut() {
    await cloudSync.signOut();
    setScreen("account");
  }
  function openPermit(returnScreen: "list" | "account") {
    setPermitReturnScreen(returnScreen);
    setScreen("permit");
  }

  return <main className="app-shell">
    {displayedScreen === "list" && <PermitChangeAlert firearms={ammunitionLedger.firearms} onOpen={() => openPermit("list")} />}
    <header className="app-header"><div><p className="eyebrow">CLAY SHOOTING ANALYSIS</p><h1><img aria-hidden="true" alt="" src={`${import.meta.env.BASE_URL}favicon.svg`} />Shoot Log</h1></div><p className="version">Version 2.19.9</p></header>
    <PwaStatus />
    {displayedScreen === "list" && <><div className="history-desktop-status"><CloudSyncStatus view={cloudSync.view} onSync={cloudSync.syncNow} /><PermitCountdown firearms={ammunitionLedger.firearms} onOpen={() => openPermit("list")} /></div><HistoryAnalysis sessions={sessions} /><SessionList sessions={sessions} firearms={ammunitionLedger.firearms} suggestedPracticeTheme={suggestedPracticeTheme} onCreate={() => setScreen("form")} onManage={() => setScreen("master")} onData={() => setScreen("data")} onAccount={() => setScreen("account")} onAmmunition={() => setScreen("ammunition")} onOpen={openSession} onDelete={deleteSession} /></>}
    {displayedScreen === "master" && <MasterDataManager masterData={masterData} onBack={() => setScreen("list")} onAdd={addMasterValue} onRename={renameMasterValue} onDelete={deleteMasterValue} />}
    {displayedScreen === "data" && <DataManagement sessions={sessions} masterData={masterData} ammunitionLedger={ammunitionLedger} onBack={() => setScreen("list")} onImport={importBackup} />}
    {displayedScreen === "account" && <AccountSettings cloud={cloudSync.view} health={cloudSync.health} passwordRecovery={cloudSync.passwordRecovery} firearms={ammunitionLedger.firearms} onBack={() => setScreen("list")} onPrivacy={() => setScreen("privacy")} onTerms={() => setScreen("terms")} onContact={() => setScreen("contact")} onSignIn={signIn} onSignUp={cloudSync.signUp} onSignOut={signOut} onSendPasswordReset={cloudSync.sendPasswordReset} onChangePassword={cloudSync.changePassword} onCompletePasswordRecovery={cloudSync.completePasswordRecovery} onSync={cloudSync.syncNow} onCheckHealth={cloudSync.checkHealth} onDeleteAccount={cloudSync.deleteAccount} onPermit={() => openPermit("account")} />}
    {displayedScreen === "privacy" && <Suspense fallback={<p>プライバシーポリシーを読み込んでいます…</p>}><PrivacyPolicy onBack={() => setScreen("account")} /></Suspense>}
    {displayedScreen === "terms" && <Suspense fallback={<p>利用規約を読み込んでいます…</p>}><TermsOfService onBack={() => setScreen("account")} /></Suspense>}
    {displayedScreen === "contact" && <Suspense fallback={<p>お問い合わせ画面を読み込んでいます…</p>}><ContactSupport onBack={() => setScreen("account")} /></Suspense>}
    {displayedScreen === "ammunition" && <Suspense fallback={<p>実包管理を読み込んでいます…</p>}><AmmunitionLedger data={ammunitionLedger} sessions={sessions} ammunitionNames={masterData.ammunitionNames} onChange={setAmmunitionLedger} onBack={() => setScreen("list")} /></Suspense>}
    {displayedScreen === "permit" && <PermitManager data={ammunitionLedger} onChange={setAmmunitionLedger} onBack={() => setScreen(permitReturnScreen)} backLabel={permitReturnScreen === "account" ? "アカウント設定へ戻る" : "履歴へ戻る"} />}
    {displayedScreen === "form" && <SessionForm rangeNames={masterData.rangeNames} ammunitionNames={masterData.ammunitionNames} firearms={ammunitionLedger.firearms} practiceRecommendation={practiceRecommendation} cancelLabel="履歴へ戻る" onCancel={() => setScreen("list")} onStart={startSession} />}
    {displayedScreen === "edit-session" && activeSession && <SessionForm initialValue={activeSession.session} rangeNames={masterData.rangeNames} ammunitionNames={masterData.ammunitionNames} firearms={ammunitionLedger.firearms} kicker="EDIT SESSION" title="基本情報を編集" submitLabel="変更を保存" onCancel={() => setScreen(activeSession.status === "completed" ? "analysis" : "round")} onStart={editSessionDetails} />}
    {displayedScreen === "round" && activeSession && activeRound && <>
      <section className="session-summary"><div><strong>{activeSession.session.date}</strong><span>{activeSession.session.rangeName}</span></div><div><span>{activeSession.session.discipline.toUpperCase()} ・ {activeSession.rounds.length}ラウンド</span><strong>{activeStats?.score} / {activeStats?.targets}　実包 {activeStats?.cartridgesUsed}発</strong><span>{activeSession.session.ammunitionName}</span></div><div className="session-actions"><button onClick={() => setScreen("edit-session")}>基本情報を編集</button><button onClick={returnToList}>履歴へ戻る</button><button className="complete-button" onClick={completeSession}>セッション完了</button></div></section>
      <PracticeThemeBanner theme={activeSession.session.practiceTheme ?? ""} />
      <div className={`round-navigation${activeSession.rounds.length >= 3 ? " round-navigation-stacked" : ""}`}>
        <nav className="round-tabs" aria-label="ラウンド選択">{activeSession.rounds.map((round) => <button className={round.id === activeRound.id ? "selected" : ""} key={round.id} onClick={() => setActiveRoundId(round.id)}>Round {round.roundNo}</button>)}</nav>
        <div className="round-actions">{activeSession.rounds.length < MAX_ROUNDS && <button className="add-round-button" onClick={addRound}>＋ Round</button>}{activeSession.rounds.length > 1 && <button className="delete-round-button" onClick={deleteActiveRound}>Round {activeRound.roundNo} 削除</button>}</div>
      </div>
      <RoundInput key={activeRound.id} round={activeRound} onChange={updateRound} />
    </>}
    {displayedScreen === "analysis" && activeSession && <SessionAnalysis session={activeSession} reviewAdvice={reviewAdvice} onBack={returnToList} onEdit={() => setScreen("edit-session")} onResume={resumeSession} onSaveReview={saveReview} />}
  </main>;
}
export default App;
