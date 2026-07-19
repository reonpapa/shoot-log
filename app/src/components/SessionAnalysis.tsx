import { calculateSessionStats, calculateRoundStats, calculateStandStats } from "../domain/shootingStats";
import type { StoredSession } from "../services/storage";
import type { SessionReview } from "../domain/shooting";
import { SessionReviewForm } from "./SessionReviewForm";
import { StandRadialChart } from "./StandRadialChart";
import { PracticeThemeBanner } from "./PracticeThemeBanner";
import "./SessionAnalysis.css";

interface Props { session: StoredSession; onBack: () => void; onResume: () => void; onEdit: () => void; onSaveReview: (review: SessionReview) => void; }

export function SessionAnalysis({ session, onBack, onResume, onEdit, onSaveReview }: Props) {
  const stats = calculateSessionStats({
    id: session.id,
    date: session.session.date,
    rangeName: session.session.rangeName,
    ammunitionName: session.session.ammunitionName,
    weather: session.session.weather,
    rounds: session.rounds,
    sessionMemo: session.session.memo,
  });
  const shootingSession = { id: session.id, date: session.session.date, rangeName: session.session.rangeName, ammunitionName: session.session.ammunitionName, weather: session.session.weather, rounds: session.rounds, sessionMemo: session.session.memo };
  const standStats = calculateStandStats(shootingSession);
  const directionScaleMax = Math.max(1, ...standStats.flatMap((stand) => [stand.missDirections.left, stand.missDirections.center, stand.missDirections.right]));

  return <section className="session-analysis">
    <header className="analysis-header">
      <div><p className="eyebrow">SESSION COMPLETE</p><h2>{session.session.date}　{session.session.rangeName}</h2><p>{session.session.discipline.toUpperCase()} ・ {session.session.ammunitionName}</p></div>
      <div className="analysis-actions"><button onClick={onBack}>履歴へ戻る</button><button onClick={onEdit}>基本情報を編集</button><button className="primary-button" onClick={onResume}>スコア編集を再開</button></div>
    </header>

    <PracticeThemeBanner compact theme={session.session.practiceTheme ?? ""} achievement={session.review.themeAchievement} />

    <div className="analysis-total"><div><span>総合スコア</span><strong>{stats.score}<small> / {stats.targets}</small></strong></div><div><span>命中率</span><strong>{stats.targets ? Math.round(stats.score / stats.targets * 100) : 0}<small>%</small></strong></div><div><span>消費実包</span><strong>{stats.cartridgesUsed}<small>発</small></strong></div></div>

    <div className="analysis-rounds">{session.rounds.map((round) => {
      const roundStats = calculateRoundStats(round);
      return <article key={round.id}><span>Round {round.roundNo}</span><strong>{roundStats.score}<small> / 25</small></strong><p>初矢 {roundStats.firstShotHits}　　二の矢 {roundStats.secondShotHits}</p><p>失中 {roundStats.misses}　　実包 {roundStats.cartridgesUsed}発</p></article>;
    })}</div>

    <div className="analysis-details"><article><span>命中内訳</span><strong>初矢 {stats.firstShotHits}</strong><strong>二の矢 {stats.secondShotHits}</strong></article><article><span>失中方向</span><strong>← {stats.missDirections.left}</strong><strong>↑ {stats.missDirections.center}</strong><strong>→ {stats.missDirections.right}</strong></article></div>

    <section className="stand-analysis"><header><div><p className="eyebrow">STAND ANALYSIS</p><h3>射台別分析</h3></div><div className="radial-legend"><span><i className="legend-hit" />総合命中率</span><span><i className="legend-first" />初矢命中率</span><span><i className="legend-left" />←失中</span><span><i className="legend-center" />↑失中</span><span><i className="legend-right" />→失中</span></div></header><div className="stand-analysis-grid">{standStats.map((stand) => <StandRadialChart directionScaleMax={directionScaleMax} key={stand.standNo} stats={stand} />)}</div></section>
    <SessionReviewForm review={session.review} practiceTheme={session.session.practiceTheme ?? ""} onSave={onSaveReview} />
  </section>;
}
