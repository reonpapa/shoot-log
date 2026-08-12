import type { StoredSession } from "../services/storage";
import { calculateSessionStats } from "../domain/shootingStats";
import { useState } from "react";
import type { Firearm } from "../domain/ammunition";
import type { ThemeAchievement } from "../domain/shooting";
import { filterSessionsByPracticeTheme, getPracticeThemeHistory, getPracticeThemeProgress, isSamePracticeTheme } from "../services/sessionPlanning";
import { formatShootingConditions } from "../services/sessionConditions";
import "./SessionList.css";
import { useLanguage } from "../i18n/LanguageContext";

interface Props { sessions: StoredSession[]; firearms: Firearm[]; suggestedPracticeTheme: string; onCreate: () => void; onManage: () => void; onData: () => void; onAccount: () => void; onAmmunition: () => void; onOpen: (id: string) => void; onDelete: (id: string) => void; }
export function SessionList({ sessions, firearms, suggestedPracticeTheme, onCreate, onManage, onData, onAccount, onAmmunition, onOpen, onDelete }: Props) {
  const { language, text } = useLanguage();
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
    <header className="session-list-header"><div><p className="eyebrow">SESSIONS</p><h2>{text("射撃履歴", "Shooting history")}</h2></div><div className="session-list-actions"><button className="account-button" onClick={onAccount}>{text("アカウント設定", "Account")}</button><button onClick={onData}>{text("バックアップ", "Backup")}</button><button onClick={onManage}>{text("登録内容を管理", "Saved items")}</button><button className="ammo-ledger-button" onClick={onAmmunition}>{text("実包管理", "Ammunition")}</button><button className="primary-button" onClick={onCreate}>{text("＋ 新しいセッション", "+ New session")}</button></div></header>
    {currentTheme && <section className={`active-practice-theme${currentThemeSelected ? " filtering" : ""}`} aria-label={text("継続中の練習テーマ", "Current practice focus")}>
      <header><div><p className="eyebrow">CURRENT FOCUS</p><strong>{text("継続中の練習テーマ", "Current practice focus")}</strong><h3>{currentTheme}</h3></div><button type="button" aria-pressed={currentThemeSelected} onClick={() => toggleThemeFilter(currentTheme)}>{currentThemeSelected ? text("すべての履歴を表示", "Show all history") : text(`関連履歴 ${themeSessions.length}件を表示`, `Show ${themeSessions.length} related sessions`)}</button></header>
      <div className="practice-theme-kpis"><article><span>{text("実施回数", "Sessions")}</span><strong>{themeProgress.sessionCount}</strong></article><article><span>{text("現在の連続", "Current streak")}</span><strong>{themeProgress.consecutiveCount}</strong></article><article><span>{text("できた", "Achieved")}</span><strong>{themeProgress.achievedCount}</strong></article></div>
      <div className="practice-theme-results"><span className="achieved">{text("できた", "Achieved")} {themeProgress.achievedCount}</span><span className="partial">{text("一部できた", "Partly achieved")} {themeProgress.partialCount}</span><span className="not-achieved">{text("できなかった", "Not achieved")} {themeProgress.notAchievedCount}</span></div>
      {scoreTrend.length > 0 ? <section className="practice-theme-trend"><h4>{text("このテーマのスコア推移", "Score trend for this focus")} <small>{text("直近5回", "Last 5")}</small></h4><div>{scoreTrend.map((item) => <article key={item.id}><strong>{item.score}<small>/{item.targets}</small></strong><div className="practice-theme-trend-track"><i style={{ height: `${item.rate}%` }} /></div><span>{item.date.slice(5)}</span></article>)}</div></section> : <p className="practice-theme-pending">{text("次回このテーマで射撃すると、ここに進捗とスコア推移が表示されます。", "Progress and score trends will appear after your next session with this focus.")}</p>}
    </section>}
    {themeHistory.length > 0 && <section className="practice-theme-history" aria-label={text("過去の練習テーマ", "Past practice focuses")}>
      <header><div><p className="eyebrow">THEME HISTORY</p><h3>{text("過去の練習テーマ", "Past practice focuses")}</h3></div><small>{text(`${themeHistory.length}テーマ`, `${themeHistory.length} focuses`)}</small></header>
      <div className="practice-theme-history-grid">{visibleThemeHistory.map((item) => {
        const selected = isSamePracticeTheme(selectedTheme, item.theme);
        const relatedCount = filterSessionsByPracticeTheme(sessions, item.theme).length;
        const historyProgress = getPracticeThemeProgress(sessions, item.theme);
        const historyScoreTrend = historyProgress.sessions.slice(-5).map((session) => {
          const stats = calculateSessionStats({ id: session.id, date: session.session.date, rangeName: session.session.rangeName, ammunitionName: session.session.ammunitionName, weather: session.session.weather, rounds: session.rounds, sessionMemo: session.session.memo });
          return { id: session.id, date: session.session.date, score: stats.score, targets: stats.targets, rate: stats.targets ? stats.score / stats.targets * 100 : 0 };
        });
        return <button type="button" className={`practice-theme-history-card${selected ? " selected" : ""}`} aria-pressed={selected} key={item.theme} onClick={() => toggleThemeFilter(item.theme)}>
          <span className="practice-theme-history-date">{text("最終実施", "Last used")} {item.latestDate}</span>
          <strong>{item.theme}</strong>
          <div><span>{text("実施", "Sessions")} <b>{item.sessionCount}</b></span><span>{text("達成率", "Achievement")} <b>{item.achievementRate === null ? text("未評価", "Not rated") : `${Math.round(item.achievementRate)}%`}</b></span><span>{text("平均", "Average")} <b>{item.averageScore === null ? "—" : item.averageScore.toFixed(1)} / 25</b></span></div>
          <div className="practice-theme-history-results"><span className="achieved">{text("できた", "Achieved")} {historyProgress.achievedCount}</span><span className="partial">{text("一部できた", "Partly achieved")} {historyProgress.partialCount}</span><span className="not-achieved">{text("できなかった", "Not achieved")} {historyProgress.notAchievedCount}</span></div>
          <div className="practice-theme-history-trend"><h4>{text("スコア推移", "Score trend")} <small>{text("直近5回", "Last 5")}</small></h4><div>{historyScoreTrend.map((score) => <article key={score.id}><strong>{score.score}<small>/{score.targets}</small></strong><div><i style={{ height: `${score.rate}%` }} /></div><span>{score.date.slice(5)}</span></article>)}</div></div>
          <small>{selected ? text("選択中・押すと解除", "Selected · Press to clear") : text(`関連履歴 ${relatedCount}件を表示 →`, `Show ${relatedCount} related sessions →`)}</small>
        </button>;
      })}</div>
      {themeHistory.length > 4 && <button type="button" className="practice-theme-history-toggle" onClick={() => setShowAllThemeHistory((current) => !current)}>{showAllThemeHistory ? text("表示を閉じる", "Show less") : text(`すべてのテーマを表示（残り${themeHistory.length - 4}件）`, `Show all focuses (${themeHistory.length - 4} more)`)}</button>}
    </section>}
    {drafts.length > 0 && <button className="unfinished-alert" onClick={() => onOpen(drafts[0].id)}><strong>{text("未完了セッション", "Incomplete sessions")} {drafts.length}</strong><span>{text("入力を続ける →", "Continue entry →")}</span></button>}
    {sessions.length === 0 ? <div className="empty-session"><p>{text("まだ射撃記録がありません。", "No shooting records yet.")}</p><button onClick={onCreate}>{text("最初のセッションを作成", "Create your first session")}</button></div> :
      orderedSessions.length === 0 ? <div className="empty-session"><p>{text("このテーマに関連する履歴はありません。", "No history matches this practice focus.")}</p><button onClick={() => { setSelectedTheme(""); setPage(1); }}>{text("すべての履歴を表示", "Show all history")}</button></div> : <div className="session-card-list">{visibleSessions.map((item) => {
        const stats = calculateSessionStats({ id: item.id, date: item.session.date, rangeName: item.session.rangeName, ammunitionName: item.session.ammunitionName, weather: item.session.weather, rounds: item.rounds, sessionMemo: item.session.memo });
        const firearm = firearms.find((candidate) => candidate.id === item.session.firearmId);
        return <article className={`session-card${item.status === "draft" ? " unfinished" : ""}`} key={item.id}>
          <button className="session-card-main" onClick={() => onOpen(item.id)}>
            <div className="session-card-info"><strong>{item.session.date}</strong><span>{item.session.rangeName}</span><small>{item.session.discipline.toUpperCase()}{text(" ・ ", " · ")}{firearm ? text(`${firearm.name}（${firearm.identifier}）`, `${firearm.name} (${firearm.identifier})`) : text("使用銃未設定", "Firearm not set")}{text(" ・ ", " · ")}{item.session.ammunitionName}</small><div className="session-card-meta">{formatShootingConditions(item.session, language) && <span>{text("コンディション：", "Conditions: ")}{formatShootingConditions(item.session, language)}</span>}{item.session.memo && <span className="session-card-memo">{text("メモ：", "Notes: ")}{item.session.memo}</span>}{item.session.practiceTheme && <span className="session-card-theme">{text("テーマ：", "Focus: ")}{item.session.practiceTheme}{item.review.themeAchievement && <b className={`session-theme-result ${item.review.themeAchievement}`}>{achievementLabel(item.review.themeAchievement, text)}</b>}</span>}{item.review?.nextChallenge && <span className="session-card-challenge">{text("次回：", "Next: ")}{item.review.nextChallenge}</span>}</div></div>
            <div className="session-card-score"><strong>{stats.score}</strong><span>/ {stats.targets}</span><small>{item.rounds.length}R{text(" ・ ", " · ")}{text("実包", "shells ")}{stats.cartridgesUsed}</small>{item.status === "draft" && <b>{text("未完了・入力を続ける", "Incomplete · Continue")}</b>}{item.status === "completed" && <small>{text("完了", "Complete")}</small>}</div>
          </button>
          <button className="session-delete-button" aria-label={text(`${item.session.date}の記録を削除`, `Delete record for ${item.session.date}`)} onClick={() => onDelete(item.id)}>{text("削除", "Delete")}</button>
        </article>;
      })}</div>}
    {totalPages > 1 && <nav className="session-pagination" aria-label={text("射撃履歴のページ", "Shooting history pages")}><button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>{text("← 前へ", "← Previous")}</button><span><strong>{currentPage}</strong> / {totalPages}</span><button disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>{text("次へ →", "Next →")}</button></nav>}
  </section>;
}

function achievementLabel(value: ThemeAchievement, text: (ja: string, en: string) => string): string {
  return { achieved: text("できた", "Achieved"), partial: text("一部できた", "Partly achieved"), "not-achieved": text("できなかった", "Not achieved") }[value];
}
