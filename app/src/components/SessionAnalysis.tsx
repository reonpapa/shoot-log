import { calculateSessionHalfComparison, calculateSessionStats, calculateRoundStats, calculateStandStats } from "../domain/shootingStats";
import type { StoredSession } from "../services/storage";
import type { SessionReview } from "../domain/shooting";
import { SessionReviewForm } from "./SessionReviewForm";
import { StandRadialChart } from "./StandRadialChart";
import { PracticeThemeBanner } from "./PracticeThemeBanner";
import { ThemeAchievementControl } from "./ThemeAchievementControl";
import { formatShootingConditions } from "../services/sessionConditions";
import type { PracticeRecommendation } from "../services/sessionPlanning";
import "./SessionAnalysis.css";

interface Props { session: StoredSession; reviewAdvice: PracticeRecommendation | null; onBack: () => void; onResume: () => void; onEdit: () => void; onSaveReview: (review: SessionReview) => void; }

export function SessionAnalysis({ session, reviewAdvice, onBack, onResume, onEdit, onSaveReview }: Props) {
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
  const halfComparison = calculateSessionHalfComparison(session.rounds);
  const directionScaleMax = Math.max(1, ...standStats.flatMap((stand) => [stand.missDirections.left, stand.missDirections.center, stand.missDirections.right]));
  const conditions = formatShootingConditions(session.session);

  return <section className="session-analysis">
    <header className="analysis-header">
      <div><p className="eyebrow">SESSION COMPLETE</p><h2>{session.session.date}　{session.session.rangeName}</h2><p>{session.session.discipline.toUpperCase()} ・ {session.session.ammunitionName}</p>{conditions && <p className="analysis-conditions">コンディション：{conditions}</p>}</div>
      <div className="analysis-actions"><button onClick={onBack}>履歴へ戻る</button><button onClick={onEdit}>基本情報を編集</button><button className="primary-button" onClick={onResume}>スコア編集を再開</button></div>
    </header>

    <PracticeThemeBanner compact theme={session.session.practiceTheme ?? ""} achievement={session.review.themeAchievement} />
    <ThemeAchievementControl review={session.review} theme={session.session.practiceTheme ?? ""} onChange={onSaveReview} />

    <div className="analysis-total"><div><span>総合スコア</span><strong>{stats.score}<small> / {stats.targets}</small></strong></div><div><span>命中率</span><strong>{stats.targets ? Math.round(stats.score / stats.targets * 100) : 0}<small>%</small></strong></div><div><span>消費実包</span><strong>{stats.cartridgesUsed}<small>発</small></strong></div></div>

    <div className="analysis-rounds">{session.rounds.map((round) => {
      const roundStats = calculateRoundStats(round);
      return <article key={round.id}><span>Round {round.roundNo}</span><strong>{roundStats.score}<small> / 25</small></strong><p>初矢 {roundStats.firstShotHits}　　二の矢 {roundStats.secondShotHits}</p><p>失中 {roundStats.misses}　　実包 {roundStats.cartridgesUsed}発</p></article>;
    })}</div>

    <div className="analysis-details"><article><span>命中内訳</span><strong>初矢 {stats.firstShotHits}</strong><strong>二の矢 {stats.secondShotHits}</strong></article><article><span>失中方向</span><strong>← {stats.missDirections.left}</strong><strong>↑ {stats.missDirections.center}</strong><strong>→ {stats.missDirections.right}</strong></article></div>

    {halfComparison && <section className={`session-half-analysis ${halfComparison.trend}`}>
      <header><div><p className="eyebrow">SESSION PACE</p><h3>前半・後半の安定度</h3></div><strong>{halfComparison.trend === "declined" ? "後半に低下" : halfComparison.trend === "improved" ? "後半に向上" : "安定"}</strong></header>
      <div className="session-half-grid"><article><span>前半 {halfComparison.first.rounds}R</span><strong>{halfComparison.first.averageScore.toFixed(1)}<small> / 25</small></strong><p>命中率 {Math.round(halfComparison.first.hitRate)}%　初矢 {Math.round(halfComparison.first.firstShotHitRate)}%</p></article><article><span>後半 {halfComparison.second.rounds}R</span><strong>{halfComparison.second.averageScore.toFixed(1)}<small> / 25</small></strong><p>命中率 {Math.round(halfComparison.second.hitRate)}%　初矢 {Math.round(halfComparison.second.firstShotHitRate)}%</p></article><article className="session-half-delta"><span>後半の変化</span><strong>{formatPointDelta(halfComparison.hitRateDelta)}<small>pt</small></strong><p>初矢 {formatPointDelta(halfComparison.firstShotHitRateDelta)}pt</p></article></div>
      <p className="session-half-advice">{halfComparison.trend === "declined" ? "後半は構えを急がず、各ラウンドの最初に頬付けと視線を整えましょう。" : halfComparison.trend === "improved" ? "後半に調子を上げています。うまくいった構えや視線を振り返りに残しましょう。" : "前半から後半まで安定しています。現在のルーティンを継続しましょう。"}</p>
    </section>}

    <section className="stand-analysis"><header><div><p className="eyebrow">STAND ANALYSIS</p><h3>射台別分析</h3></div><div className="radial-legend"><span><i className="legend-hit" />総合命中率</span><span><i className="legend-first" />初矢命中率</span><span><i className="legend-left" />←失中</span><span><i className="legend-center" />↑失中</span><span><i className="legend-right" />→失中</span></div></header><div className="stand-analysis-grid">{standStats.map((stand) => <StandRadialChart directionScaleMax={directionScaleMax} key={stand.standNo} stats={stand} />)}</div></section>
    <SessionReviewForm review={session.review} advice={reviewAdvice} onSave={onSaveReview} onBack={onBack} />
  </section>;
}

function formatPointDelta(value: number): string {
  return `${value > 0 ? "+" : ""}${Math.round(value)}`;
}
