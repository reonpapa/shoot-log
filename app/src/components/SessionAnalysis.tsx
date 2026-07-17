import { calculateSessionStats, calculateRoundStats } from "../domain/shootingStats";
import type { StoredSession } from "../services/storage";
import "./SessionAnalysis.css";

interface Props { session: StoredSession; onBack: () => void; onResume: () => void; }

export function SessionAnalysis({ session, onBack, onResume }: Props) {
  const stats = calculateSessionStats({
    id: session.id,
    date: session.session.date,
    rangeName: session.session.rangeName,
    ammunitionName: session.session.ammunitionName,
    weather: session.session.weather,
    rounds: session.rounds,
    sessionMemo: session.session.memo,
  });

  return <section className="session-analysis">
    <header className="analysis-header">
      <div><p className="eyebrow">SESSION COMPLETE</p><h2>{session.session.date}　{session.session.rangeName}</h2><p>{session.session.discipline.toUpperCase()} ・ {session.session.ammunitionName}</p></div>
      <div className="analysis-actions"><button onClick={onBack}>履歴へ戻る</button><button className="primary-button" onClick={onResume}>編集を再開</button></div>
    </header>

    <div className="analysis-total"><div><span>総合スコア</span><strong>{stats.score}<small> / {stats.targets}</small></strong></div><div><span>命中率</span><strong>{stats.targets ? Math.round(stats.score / stats.targets * 100) : 0}<small>%</small></strong></div><div><span>消費実包</span><strong>{stats.cartridgesUsed}<small>発</small></strong></div></div>

    <div className="analysis-rounds">{session.rounds.map((round) => {
      const roundStats = calculateRoundStats(round);
      return <article key={round.id}><span>Round {round.roundNo}</span><strong>{roundStats.score}<small> / 25</small></strong><p>初矢 {roundStats.firstShotHits}　　二の矢 {roundStats.secondShotHits}</p><p>失中 {roundStats.misses}　　実包 {roundStats.cartridgesUsed}発</p></article>;
    })}</div>

    <div className="analysis-details"><article><span>命中内訳</span><strong>初矢 {stats.firstShotHits}</strong><strong>二の矢 {stats.secondShotHits}</strong></article><article><span>失中方向</span><strong>← {stats.missDirections.left}</strong><strong>↑ {stats.missDirections.center}</strong><strong>→ {stats.missDirections.right}</strong></article></div>
  </section>;
}
