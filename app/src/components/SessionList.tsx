import type { StoredSession } from "../services/storage";
import { calculateSessionStats } from "../domain/shootingStats";
import { useState } from "react";
import type { Firearm } from "../domain/ammunition";
import type { ThemeAchievement } from "../domain/shooting";
import { filterSessionsByPracticeTheme, getPracticeThemeHistory, getPracticeThemeProgress, isSamePracticeTheme } from "../services/sessionPlanning";
import { formatShootingConditions } from "../services/sessionConditions";
import "./SessionList.css";

interface Props { sessions: StoredSession[]; firearms: Firearm[]; suggestedPracticeTheme: string; onCreate: () => void; onManage: () => void; onData: () => void; onAccount: () => void; onAmmunition: () => void; onOpen: (id: string) => void; onDelete: (id: string) => void; }
export function SessionList({ sessions, firearms, suggestedPracticeTheme, onCreate, onManage, onData, onAccount, onAmmunition, onOpen, onDelete }: Props) {
  const [page, setPage] = useState(1);
  const [selectedTheme, setSelectedTheme] = useState("");
  const [showAllThemeHistory, setShowAllThemeHistory] = useState(false);
  const pageSize = 10;
  const drafts = sessions.filter((item) => item.status === "draft");
  const currentTheme = suggestedPracticeTheme.trim();
  const themeSessions = filterSessionsByPracticeTheme(sessions, currentTheme);
  const themeProgress = getPracticeThemeProgress(sessions, currentTheme);
  const themeHistory = getPracticeThemeHistory(sessions).filter((item) => !isSamePracticeTheme(item.theme, currentTheme));
  const visibleThemeHistory = showAllThemeHistory ? themeHistory : themeHistory.slice(0, 4);
  const currentThemeSelected = isSamePracticeTheme(selectedTheme, currentTheme);
  const scoreTrend = themeProgress.sessions.slice(-5).map((item) => {
    const stats = calculateSessionStats({ id: item.id, date: item.session.date, rangeName: item.session.rangeName, ammunitionName: item.session.ammunitionName, weather: item.session.weather, rounds: item.rounds, sessionMemo: item.session.memo });
    return { id: item.id, date: item.session.date, score: stats.score, targets: stats.targets, rate: stats.targets ? stats.score / stats.targets * 100 : 0 };
  });
  const filteredSessions = selectedTheme ? filterSessionsByPracticeTheme(sessions, selectedTheme) : sessions;
  const orderedSessions = [...filteredSessions].sort((a, b) =>
    b.session.date.localeCompare(a.session.date) || b.createdAt.localeCompare(a.createdAt)
  );
  const totalPages = Math.max(1, Math.ceil(orderedSessions.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleSessions = orderedSessions.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  function toggleThemeFilter(theme: string) {
    setSelectedTheme((current) => isSamePracticeTheme(current, theme) ? "" : theme);
    setPage(1);
  }
  return <section className="session-list">
    <header className="session-list-header"><div><p className="eyebrow">SESSIONS</p><h2>射撃履歴</h2></div><div className="session-list-actions"><button className="account-button" onClick={onAccount}>アカウント設定</button><button onClick={onData}>バックアップ</button><button onClick={onManage}>登録内容を管理</button><button className="ammo-ledger-button" onClick={onAmmunition}>実包管理</button><button className="primary-button" onClick={onCreate}>＋ 新しいセッション</button></div></header>
    {currentTheme && <section className={`active-practice-theme${currentThemeSelected ? " filtering" : ""}`} aria-label="継続中の練習テーマ">
      <header><div><p className="eyebrow">CURRENT FOCUS</p><strong>継続中の練習テーマ</strong><h3>{currentTheme}</h3></div><button type="button" aria-pressed={currentThemeSelected} onClick={() => toggleThemeFilter(currentTheme)}>{currentThemeSelected ? "すべての履歴を表示" : `関連履歴 ${themeSessions.length}件を表示`}</button></header>
      <div className="practice-theme-kpis"><article><span>実施回数</span><strong>{themeProgress.sessionCount}<small>回</small></strong></article><article><span>現在の連続</span><strong>{themeProgress.consecutiveCount}<small>回</small></strong></article><article><span>できた</span><strong>{themeProgress.achievedCount}<small>回</small></strong></article></div>
      <div className="practice-theme-results"><span className="achieved">できた {themeProgress.achievedCount}</span><span className="partial">一部できた {themeProgress.partialCount}</span><span className="not-achieved">できなかった {themeProgress.notAchievedCount}</span></div>
      {scoreTrend.length > 0 ? <section className="practice-theme-trend"><h4>このテーマのスコア推移 <small>直近5回</small></h4><div>{scoreTrend.map((item) => <article key={item.id}><strong>{item.score}<small>/{item.targets}</small></strong><div className="practice-theme-trend-track"><i style={{ height: `${item.rate}%` }} /></div><span>{item.date.slice(5)}</span></article>)}</div></section> : <p className="practice-theme-pending">次回このテーマで射撃すると、ここに進捗とスコア推移が表示されます。</p>}
    </section>}
    {themeHistory.length > 0 && <section className="practice-theme-history" aria-label="過去の練習テーマ">
      <header><div><p className="eyebrow">THEME HISTORY</p><h3>過去の練習テーマ</h3></div><small>{themeHistory.length}テーマ</small></header>
      <div className="practice-theme-history-grid">{visibleThemeHistory.map((item) => {
        const selected = isSamePracticeTheme(selectedTheme, item.theme);
        const relatedCount = filterSessionsByPracticeTheme(sessions, item.theme).length;
        const historyProgress = getPracticeThemeProgress(sessions, item.theme);
        const historyScoreTrend = historyProgress.sessions.slice(-5).map((session) => {
          const stats = calculateSessionStats({ id: session.id, date: session.session.date, rangeName: session.session.rangeName, ammunitionName: session.session.ammunitionName, weather: session.session.weather, rounds: session.rounds, sessionMemo: session.session.memo });
          return { id: session.id, date: session.session.date, score: stats.score, targets: stats.targets, rate: stats.targets ? stats.score / stats.targets * 100 : 0 };
        });
        return <button type="button" className={`practice-theme-history-card${selected ? " selected" : ""}`} aria-pressed={selected} key={item.theme} onClick={() => toggleThemeFilter(item.theme)}>
          <span className="practice-theme-history-date">最終実施 {item.latestDate}</span>
          <strong>{item.theme}</strong>
          <div><span>実施 <b>{item.sessionCount}回</b></span><span>達成率 <b>{item.achievementRate === null ? "未評価" : `${Math.round(item.achievementRate)}%`}</b></span><span>平均 <b>{item.averageScore === null ? "—" : item.averageScore.toFixed(1)} / 25</b></span></div>
          <div className="practice-theme-history-results"><span className="achieved">できた {historyProgress.achievedCount}</span><span className="partial">一部できた {historyProgress.partialCount}</span><span className="not-achieved">できなかった {historyProgress.notAchievedCount}</span></div>
          <div className="practice-theme-history-trend"><h4>スコア推移 <small>直近5回</small></h4><div>{historyScoreTrend.map((score) => <article key={score.id}><strong>{score.score}<small>/{score.targets}</small></strong><div><i style={{ height: `${score.rate}%` }} /></div><span>{score.date.slice(5)}</span></article>)}</div></div>
          <small>{selected ? "選択中・押すと解除" : `関連履歴 ${relatedCount}件を表示 →`}</small>
        </button>;
      })}</div>
      {themeHistory.length > 4 && <button type="button" className="practice-theme-history-toggle" onClick={() => setShowAllThemeHistory((current) => !current)}>{showAllThemeHistory ? "表示を閉じる" : `すべてのテーマを表示（残り${themeHistory.length - 4}件）`}</button>}
    </section>}
    {drafts.length > 0 && <button className="unfinished-alert" onClick={() => onOpen(drafts[0].id)}><strong>未完了セッション {drafts.length}件</strong><span>入力を続ける →</span></button>}
    {sessions.length === 0 ? <div className="empty-session"><p>まだ射撃記録がありません。</p><button onClick={onCreate}>最初のセッションを作成</button></div> :
      orderedSessions.length === 0 ? <div className="empty-session"><p>このテーマに関連する履歴はありません。</p><button onClick={() => { setSelectedTheme(""); setPage(1); }}>すべての履歴を表示</button></div> : <div className="session-card-list">{visibleSessions.map((item) => {
        const stats = calculateSessionStats({ id: item.id, date: item.session.date, rangeName: item.session.rangeName, ammunitionName: item.session.ammunitionName, weather: item.session.weather, rounds: item.rounds, sessionMemo: item.session.memo });
        const firearm = firearms.find((candidate) => candidate.id === item.session.firearmId);
        return <article className={`session-card${item.status === "draft" ? " unfinished" : ""}`} key={item.id}>
          <button className="session-card-main" onClick={() => onOpen(item.id)}>
            <div className="session-card-info"><strong>{item.session.date}</strong><span>{item.session.rangeName}</span><small>{item.session.discipline.toUpperCase()} ・ {firearm ? `${firearm.name}（${firearm.identifier}）` : "使用銃未設定"} ・ {item.session.ammunitionName}</small><div className="session-card-meta">{formatShootingConditions(item.session) && <span>コンディション：{formatShootingConditions(item.session)}</span>}{item.session.memo && <span className="session-card-memo">メモ：{item.session.memo}</span>}{item.session.practiceTheme && <span className="session-card-theme">テーマ：{item.session.practiceTheme}{item.review.themeAchievement && <b className={`session-theme-result ${item.review.themeAchievement}`}>{achievementLabel(item.review.themeAchievement)}</b>}</span>}{item.review?.nextChallenge && <span className="session-card-challenge">次回：{item.review.nextChallenge}</span>}</div></div>
            <div className="session-card-score"><strong>{stats.score}</strong><span>/ {stats.targets}</span><small>{item.rounds.length}R ・ 実包{stats.cartridgesUsed}発</small>{item.status === "draft" && <b>未完了・入力を続ける</b>}{item.status === "completed" && <small>完了</small>}</div>
          </button>
          <button className="session-delete-button" aria-label={`${item.session.date}の記録を削除`} onClick={() => onDelete(item.id)}>削除</button>
        </article>;
      })}</div>}
    {totalPages > 1 && <nav className="session-pagination" aria-label="射撃履歴のページ"><button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>← 前へ</button><span><strong>{currentPage}</strong> / {totalPages}</span><button disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>次へ →</button></nav>}
  </section>;
}

function achievementLabel(value: ThemeAchievement): string {
  return { achieved: "できた", partial: "一部できた", "not-achieved": "できなかった" }[value];
}
