import { calculateSessionStats, calculateRoundStats, calculateStandStats } from "../domain/shootingStats";
import type { StoredSession } from "../services/storage";
import type { SessionReview } from "../domain/shooting";
import { SessionReviewForm } from "./SessionReviewForm";
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

  return <section className="session-analysis">
    <header className="analysis-header">
      <div><p className="eyebrow">SESSION COMPLETE</p><h2>{session.session.date}　{session.session.rangeName}</h2><p>{session.session.discipline.toUpperCase()} ・ {session.session.ammunitionName}</p></div>
      <div className="analysis-actions"><button onClick={onBack}>履歴へ戻る</button><button onClick={onEdit}>基本情報を編集</button><button className="primary-button" onClick={onResume}>スコア編集を再開</button></div>
    </header>

    <div className="analysis-total"><div><span>総合スコア</span><strong>{stats.score}<small> / {stats.targets}</small></strong></div><div><span>命中率</span><strong>{stats.targets ? Math.round(stats.score / stats.targets * 100) : 0}<small>%</small></strong></div><div><span>消費実包</span><strong>{stats.cartridgesUsed}<small>発</small></strong></div></div>

    <div className="analysis-rounds">{session.rounds.map((round) => {
      const roundStats = calculateRoundStats(round);
      return <article key={round.id}><span>Round {round.roundNo}</span><strong>{roundStats.score}<small> / 25</small></strong><p>初矢 {roundStats.firstShotHits}　　二の矢 {roundStats.secondShotHits}</p><p>失中 {roundStats.misses}　　実包 {roundStats.cartridgesUsed}発</p></article>;
    })}</div>

    <div className="analysis-details"><article><span>命中内訳</span><strong>初矢 {stats.firstShotHits}</strong><strong>二の矢 {stats.secondShotHits}</strong></article><article><span>失中方向</span><strong>← {stats.missDirections.left}</strong><strong>↑ {stats.missDirections.center}</strong><strong>→ {stats.missDirections.right}</strong></article></div>

    <section className="stand-analysis"><header><div><p className="eyebrow">STAND ANALYSIS</p><h3>射台別分析</h3></div><small>矢印は失中したクレーの飛翔方向</small></header><div className="stand-analysis-grid">{standStats.map((stand) => <article key={stand.standNo}><div className="stand-title"><span>射台</span><strong>{stand.standNo}</strong><b>{stand.targets ? Math.round(stand.score / stand.targets * 100) : 0}%</b></div><p className="stand-score">{stand.score} <small>/ {stand.targets}</small></p><div className="stand-breakdown"><span>初矢 <b>{stand.firstShotHits}</b></span><span>二の矢 <b>{stand.secondShotHits}</b></span><span>失中 <b>{stand.misses}</b></span></div><div className="stand-misses"><small>失中クレー方向</small><span>← {stand.missDirections.left}</span><span>↑ {stand.missDirections.center}</span><span>→ {stand.missDirections.right}</span></div></article>)}</div></section>
    <SessionReviewForm review={session.review} onSave={onSaveReview} />
  </section>;
}
