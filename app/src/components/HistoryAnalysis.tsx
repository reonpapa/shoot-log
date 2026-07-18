import { useMemo, useState } from "react";
import { calculateRoundStats, calculateSessionStats, calculateStandStats } from "../domain/shootingStats";
import type { FireMode } from "../domain/shooting";
import type { StoredSession } from "../services/storage";
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

  const filtered = useMemo(() => {
    const bySession = completed
      .filter((item) => rangeName === "all" || item.session.rangeName === rangeName)
      .filter((item) => ammunitionName === "all" || item.session.ammunitionName === ammunitionName)
      .sort((a, b) => b.session.date.localeCompare(a.session.date));
    const limited = period === "all" ? bySession : bySession.slice(0, Number(period));
    return limited.map((item) => ({ ...item, rounds: fireMode === "all" ? item.rounds : item.rounds.filter((round) => round.fireMode === fireMode) })).filter((item) => item.rounds.length > 0).reverse();
  }, [completed, rangeName, ammunitionName, fireMode, period]);

  if (completed.length < 2) return null;
  const rounds = filtered.flatMap((item) => item.rounds);
  const totalScore = rounds.reduce((sum, round) => sum + calculateRoundStats(round).score, 0);
  const average = rounds.length ? totalScore / rounds.length : 0;
  const best = rounds.reduce((highest, round) => Math.max(highest, calculateRoundStats(round).score), 0);
  const totalCartridges = filtered.reduce((sum, item) => sum + calculateSessionStats({ id: item.id, date: item.session.date, rangeName: item.session.rangeName, ammunitionName: item.session.ammunitionName, weather: item.session.weather, rounds: item.rounds, sessionMemo: item.session.memo }).cartridgesUsed, 0);
  const stands = calculateStandStats({ id: "history", date: "", rangeName: "", ammunitionName: "", rounds });

  return <section className="history-analysis">
    <header><div><p className="eyebrow">PERFORMANCE</p><h2>成長分析</h2></div><small>対象セッション {filtered.length}件</small></header>
    <div className="analysis-filters"><label><span>射撃場</span><select value={rangeName} onChange={(event) => setRangeName(event.target.value)}><option value="all">すべて</option>{rangeOptions.map((name) => <option key={name}>{name}</option>)}</select></label><label><span>実包</span><select value={ammunitionName} onChange={(event) => setAmmunitionName(event.target.value)}><option value="all">すべて</option>{ammunitionOptions.map((name) => <option key={name}>{name}</option>)}</select></label><label><span>発射方式</span><select value={fireMode} onChange={(event) => setFireMode(event.target.value as "all" | FireMode)}><option value="all">すべて</option><option value="single">1発撃ち</option><option value="double">2発撃ち</option></select></label><label><span>期間</span><select value={period} onChange={(event) => setPeriod(event.target.value as Period)}><option value="all">全期間</option><option value="5">直近5回</option><option value="10">直近10回</option></select></label></div>
    {rounds.length === 0 ? <div className="analysis-empty">条件に一致するラウンドがありません。</div> : <>
      <div className="history-kpis"><article><span>平均スコア</span><strong>{average.toFixed(1)}<small> / 25</small></strong></article><article><span>最高ラウンド</span><strong>{best}<small> / 25</small></strong></article><article><span>対象ラウンド</span><strong>{rounds.length}<small>R</small></strong></article><article><span>消費実包</span><strong>{totalCartridges}<small>発</small></strong></article></div>
      <section className="score-trend"><h3>セッション推移</h3><div className="trend-scroll"><div className="trend-bars">{filtered.map((item) => {
        const score = item.rounds.reduce((sum, round) => sum + calculateRoundStats(round).score, 0);
        const sessionAverage = score / item.rounds.length;
        return <article key={item.id}><div className="trend-value">{sessionAverage.toFixed(1)}</div><div className="trend-track"><div style={{ height: `${sessionAverage / 25 * 100}%` }} /></div><strong>{item.session.date.slice(5)}</strong><small>{item.rounds.length}R</small></article>;
      })}</div></div></section>
      <section className="history-stands"><h3>射台別成績</h3><div>{stands.map((stand) => {
        const rate = stand.targets ? Math.round(stand.score / stand.targets * 100) : 0;
        return <article key={stand.standNo}><header><span>射台 {stand.standNo}</span><strong>{rate}%</strong></header><div className="stand-rate"><i style={{ width: `${rate}%` }} /></div><p>{stand.score}/{stand.targets}　失中 {stand.misses}</p><small>失中クレー　←{stand.missDirections.left}　↑{stand.missDirections.center}　→{stand.missDirections.right}</small></article>;
      })}</div></section>
    </>}
  </section>;
}
