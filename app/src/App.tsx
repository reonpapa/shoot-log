import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { RoundInput } from "./components/RoundInput";
import { SessionForm, type SessionDraft } from "./components/SessionForm";
import { SessionList } from "./components/SessionList";
import { SessionAnalysis } from "./components/SessionAnalysis";
import { HistoryAnalysis } from "./components/HistoryAnalysis";
import { MasterDataManager, type MasterKind } from "./components/MasterDataManager";
import { DataManagement } from "./components/DataManagement";
import { createEmptyRound, type ShootingRound } from "./domain/shooting";
import type { SessionReview } from "./domain/shooting";
import { calculateSessionStats } from "./domain/shootingStats";
import { loadSessions, saveSessions, type StoredSession } from "./services/storage";
import { addSessionToMasterData, loadMasterData, saveMasterData, type MasterData } from "./services/masterData";
import { mergeMasterData, mergeSessions, type ShootLogBackup } from "./services/backup";

type Screen = "list" | "form" | "round" | "analysis" | "edit-session" | "master" | "data";
const MAX_ROUNDS = 4;

function App() {
  const [sessions, setSessions] = useState<StoredSession[]>(loadSessions);
  const [masterData, setMasterData] = useState<MasterData>(() => loadSessions().reduce((result, item) => addSessionToMasterData(result, item.session), loadMasterData()));
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeRoundId, setActiveRoundId] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>("list");
  const activeSession = useMemo(() => sessions.find((item) => item.id === activeSessionId) ?? null, [sessions, activeSessionId]);
  const activeRound = activeSession?.rounds.find((round) => round.id === activeRoundId) ?? activeSession?.rounds[0] ?? null;
  const activeStats = activeSession ? calculateSessionStats({ id: activeSession.id, date: activeSession.session.date, rangeName: activeSession.session.rangeName, ammunitionName: activeSession.session.ammunitionName, weather: activeSession.session.weather, rounds: activeSession.rounds, sessionMemo: activeSession.session.memo }) : null;

  useEffect(() => saveSessions(sessions), [sessions]);
  useEffect(() => saveMasterData(masterData), [masterData]);
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
  }
  function saveReview(review: SessionReview) {
    if (!activeSessionId) return;
    setSessions((current) => current.map((item) => item.id === activeSessionId ? { ...item, review, updatedAt: new Date().toISOString() } : item));
  }
  function deleteSession(id: string) {
    const item = sessions.find((session) => session.id === id);
    if (item && window.confirm(`${item.session.date}の記録を削除しますか？`)) setSessions((current) => current.filter((session) => session.id !== id));
  }
  function returnToList() { setActiveSessionId(null); setActiveRoundId(null); setScreen("list"); }

  return <main className="app-shell">
    <header className="app-header"><div><p className="eyebrow">CLAY SHOOTING ANALYSIS</p><h1>Shoot Log</h1></div><p className="version">Version 0.6.1</p></header>
    {screen === "list" && <><HistoryAnalysis sessions={sessions} /><SessionList sessions={sessions} onCreate={() => setScreen("form")} onManage={() => setScreen("master")} onData={() => setScreen("data")} onOpen={openSession} onDelete={deleteSession} /></>}
    {screen === "master" && <MasterDataManager masterData={masterData} onBack={() => setScreen("list")} onAdd={addMasterValue} onRename={renameMasterValue} onDelete={deleteMasterValue} />}
    {screen === "data" && <DataManagement sessions={sessions} masterData={masterData} onBack={() => setScreen("list")} onImport={importBackup} />}
    {screen === "form" && <SessionForm rangeNames={masterData.rangeNames} ammunitionNames={masterData.ammunitionNames} cancelLabel="履歴へ戻る" onCancel={() => setScreen("list")} onStart={startSession} />}
    {screen === "edit-session" && activeSession && <SessionForm initialValue={activeSession.session} rangeNames={masterData.rangeNames} ammunitionNames={masterData.ammunitionNames} kicker="EDIT SESSION" title="基本情報を編集" submitLabel="変更を保存" onCancel={() => setScreen(activeSession.status === "completed" ? "analysis" : "round")} onStart={editSessionDetails} />}
    {screen === "round" && activeSession && activeRound && <>
      <section className="session-summary"><div><strong>{activeSession.session.date}</strong><span>{activeSession.session.rangeName}</span></div><div><span>{activeSession.session.discipline.toUpperCase()} ・ {activeSession.rounds.length}ラウンド</span><strong>{activeStats?.score} / {activeStats?.targets}　実包 {activeStats?.cartridgesUsed}発</strong><span>{activeSession.session.ammunitionName}</span></div><div className="session-actions"><button onClick={() => setScreen("edit-session")}>基本情報を編集</button><button onClick={returnToList}>履歴へ戻る</button><button className="complete-button" onClick={completeSession}>セッション完了</button></div></section>
      <nav className="round-tabs" aria-label="ラウンド選択">{activeSession.rounds.map((round) => <button className={round.id === activeRound.id ? "selected" : ""} key={round.id} onClick={() => setActiveRoundId(round.id)}>Round {round.roundNo}</button>)}{activeSession.rounds.length < MAX_ROUNDS && <button className="add-round-button" onClick={addRound}>＋ Round</button>}</nav>
      <RoundInput round={activeRound} onChange={updateRound} />
    </>}
    {screen === "analysis" && activeSession && <SessionAnalysis session={activeSession} onBack={returnToList} onEdit={() => setScreen("edit-session")} onResume={resumeSession} onSaveReview={saveReview} />}
  </main>;
}
export default App;
