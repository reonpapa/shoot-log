import { useState } from "react";
import { calculateRoundStats, calculateRoundWindowComparison, calculateSessionStats, calculateStandStats } from "../domain/shootingStats";
import type { FireMode } from "../domain/shooting";
import type { StoredSession } from "../services/storage";
import { StandRadialChart } from "./StandRadialChart";
import "./HistoryAnalysis.css";

interface Props { sessions: StoredSession[]; }
type Period = "all" | "5" | "10";

export function HistoryAnalysis({ sessions }: Props) {
  const [rangeName, setRangeName] = useState("all");
  const [ammunitionName, setAmmunitionName] = useState("all");
  const [fireMode, setFireMode] = useState<"all" | FireMode>("all");
  const [period, setPeriod] = useState<Period>("all");
  const completed = sessions.filter((item) => item.status === "completed");
  const rangeOptions = [...new Set(completed.map((item) => item.session.rangeName))].sort((a, b) => a.localeCompare(b, "ja"));
  const ammunitionOptions = [...new Set(completed.map((item) => item.session.ammunitionName))].sort((a, b) => a.localeCompare(b, "ja"));

  const matched = completed
    .filter((item) => rangeName === "all" || item.session.rangeName === rangeName)
    .filter((item) => ammunitionName === "all" || item.session.ammunitionName === ammunitionName)
    .sort((a, b) => a.session.date.localeCompare(b.session.date) || a.createdAt.localeCompare(b.createdAt))
    .map((item) => ({ ...item, rounds: fireMode === "all" ? item.rounds : item.rounds.filter((round) => round.fireMode === fireMode) }))
    .filter((item) => item.rounds.length > 0);
  const filtered = period === "all" ? matched : matched.slice(-Number(period));

  if (completed.length < 2) return null;
  const rounds = filtered.flatMap((item) => item.rounds);
  const comparisonRounds = matched.flatMap((item) => item.rounds);
  const comparison = calculateRoundWindowComparison(comparisonRounds);
  const totalScore = rounds.reduce((sum, round) => sum + calculateRoundStats(round).score, 0);
  const average = rounds.length ? totalScore / rounds.length : 0;
  const best = rounds.reduce((highest, round) => Math.max(highest, calculateRoundStats(round).score), 0);
  const totalCartridges = filtered.reduce((sum, item) => sum + calculateSessionStats({ id: item.id, date: item.session.date, rangeName: item.session.rangeName, ammunitionName: item.session.ammunitionName, weather: item.session.weather, rounds: item.rounds, sessionMemo: item.session.memo }).cartridgesUsed, 0);
  const stands = calculateStandStats({ id: "history", date: "", rangeName: "", ammunitionName: "", rounds });
  const directionScaleMax = Math.max(1, ...stands.flatMap((stand) => [stand.missDirections.left, stand.missDirections.center, stand.missDirections.right]));

  return <section className="history-analysis">
    <header><div><p className="eyebrow">PERFORMANCE</p><h2>成長分析</h2></div><small>対象セッション {filtered.length}件</small></header>
    <div className="analysis-filters"><label><span>射撃場</span><select value={rangeName} onChange={(event) => setRangeName(event.target.value)}><option value="all">すべて</option>{rangeOptions.map((name) => <option key={name}>{name}</option>)}</select></label><label><span>実包</span><select value={ammunitionName} onChange={(event) => setAmmunitionName(event.target.value)}><option value="all">すべて</option>{ammunitionOptions.map((name) => <option key={name}>{name}</option>)}</select></label><label><span>発射方式</span><select value={fireMode} onChange={(event) => setFireMode(event.target.value as "all" | FireMode)}><option value="all">すべて</option><option value="single">1発撃ち</option><option value="double">2発撃ち</option></select></label><label><span>期間</span><select value={period} onChange={(event) => setPeriod(event.target.value as Period)}><option value="all">全期間</option><option value="5">直近5回</option><option value="10">直近10回</option></select></label></div>
    {rounds.length === 0 ? <div className="analysis-empty">条件に一致するラウンドがありません。</div> : <>
      <div className="history-kpis"><article><span>平均スコア</span><strong>{average.toFixed(1)}<small> / 25</small></strong></article><article><span>最高ラウンド</span><strong>{best}<small> / 25</small></strong></article><article><span>対象ラウンド</span><strong>{rounds.length}<small>R</small></strong></article><article><span>消費実包</span><strong>{totalCartridges}<small>発</small></strong></article></div>
      <section className={`performance-comparison${comparison ? "" : " is-pending"}`}>
        <header><div><p className="eyebrow">RECENT COMPARISON</p><h3>直近5ラウンド比較</h3></div><small>同じ絞り込み条件で、その前5ラウンドと比較</small></header>
        {comparison ? <div className="comparison-grid">
          <article><span>平均スコア</span><strong>{comparison.recent.averageScore.toFixed(1)}<small> / 25</small></strong><p className={deltaClass(comparison.averageScoreDelta)}>{formatDelta(comparison.averageScoreDelta, "")}</p><small>前5R {comparison.previous.averageScore.toFixed(1)}</small></article>
          <article><span>初矢命中率</span><strong>{comparison.recent.firstShotHitRate.toFixed(1)}<small>%</small></strong><p className={deltaClass(comparison.firstShotHitRateDelta)}>{formatDelta(comparison.firstShotHitRateDelta, "pt")}</p><small>前5R {comparison.previous.firstShotHitRate.toFixed(1)}%</small></article>
          <article><span>現在の課題射台</span><strong>{comparison.weakestStand.standNo}<small>番射台</small></strong><p>命中率 {comparison.weakestStand.hitRate.toFixed(1)}%</p><small className={deltaClass(comparison.weakestStand.delta)}>前5R比 {formatDelta(comparison.weakestStand.delta, "pt")}</small></article>
        </div> : <div className="comparison-pending"><strong>比較まであと {Math.max(0, 10 - comparisonRounds.length)}R</strong><p>同じ条件の記録が10ラウンドになると、直近5Rの変化を表示します。</p></div>}
      </section>
      <section className="score-trend"><h3>セッション推移</h3><div className="trend-scroll"><div className="trend-bars">{filtered.map((item) => {
        const score = item.rounds.reduce((sum, round) => sum + calculateRoundStats(round).score, 0);
        const sessionAverage = score / item.rounds.length;
        return <article key={item.id}><div className="trend-value">{sessionAverage.toFixed(1)}</div><div className="trend-track"><div style={{ height: `${sessionAverage / 25 * 100}%` }} /></div><strong>{item.session.date.slice(5)}</strong><small>{item.rounds.length}R</small></article>;
      })}</div></div></section>
      <section className="history-stands"><header><h3>射台別成績</h3><div className="radial-legend"><span><i className="legend-hit" />総合命中率</span><span><i className="legend-first" />初矢命中率</span><span><i className="legend-left" />←失中</span><span><i className="legend-center" />↑失中</span><span><i className="legend-right" />→失中</span></div></header><div>{stands.map((stand) => <StandRadialChart directionScaleMax={directionScaleMax} key={stand.standNo} stats={stand} />)}</div></section>
    </>}
  </section>;
}

function deltaClass(value: number): string {
  if (value > 0.05) return "comparison-delta is-up";
  if (value < -0.05) return "comparison-delta is-down";
  return "comparison-delta is-flat";
}

function formatDelta(value: number, unit: string): string {
  const normalized = Math.abs(value) < 0.05 ? 0 : value;
  return `${normalized > 0 ? "+" : ""}${normalized.toFixed(1)}${unit}`;
}
