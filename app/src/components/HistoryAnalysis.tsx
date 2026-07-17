import { calculateRoundStats, calculateSessionStats, calculateStandStats } from "../domain/shootingStats";
import type { StoredSession } from "../services/storage";
import "./HistoryAnalysis.css";

interface Props { sessions: StoredSession[]; }

export function HistoryAnalysis({ sessions }: Props) {
  const completed = sessions.filter((item) => item.status === "completed");
  if (completed.length < 2) return null;
  const chronological = [...completed].sort((a, b) => a.session.date.localeCompare(b.session.date));
  const rounds = chronological.flatMap((item) => item.rounds);
  const totalScore = rounds.reduce((sum, round) => sum + calculateRoundStats(round).score, 0);
  const average = rounds.length ? totalScore / rounds.length : 0;
  const best = rounds.reduce((highest, round) => Math.max(highest, calculateRoundStats(round).score), 0);
  const totalCartridges = chronological.reduce((sum, item) => sum + calculateSessionStats({ id: item.id, date: item.session.date, rangeName: item.session.rangeName, ammunitionName: item.session.ammunitionName, weather: item.session.weather, rounds: item.rounds, sessionMemo: item.session.memo }).cartridgesUsed, 0);
  const stands = calculateStandStats({ id: "history", date: "", rangeName: "", ammunitionName: "", rounds });

  return <section className="history-analysis">
    <header><div><p className="eyebrow">PERFORMANCE</p><h2>成長分析</h2></div><small>完了セッション {completed.length}件</small></header>
    <div className="history-kpis"><article><span>平均スコア</span><strong>{average.toFixed(1)}<small> / 25</small></strong></article><article><span>最高ラウンド</span><strong>{best}<small> / 25</small></strong></article><article><span>累計ラウンド</span><strong>{rounds.length}<small>R</small></strong></article><article><span>累計実包</span><strong>{totalCartridges}<small>発</small></strong></article></div>
    <section className="score-trend"><h3>セッション推移</h3><div className="trend-scroll"><div className="trend-bars">{chronological.map((item) => {
      const score = item.rounds.reduce((sum, round) => sum + calculateRoundStats(round).score, 0);
      const sessionAverage = item.rounds.length ? score / item.rounds.length : 0;
      return <article key={item.id}><div className="trend-value">{sessionAverage.toFixed(1)}</div><div className="trend-track"><div style={{ height: `${sessionAverage / 25 * 100}%` }} /></div><strong>{item.session.date.slice(5)}</strong><small>{item.rounds.length}R</small></article>;
    })}</div></div></section>
    <section className="history-stands"><h3>全期間の射台別成績</h3><div>{stands.map((stand) => {
      const rate = stand.targets ? Math.round(stand.score / stand.targets * 100) : 0;
      return <article key={stand.standNo}><header><span>射台 {stand.standNo}</span><strong>{rate}%</strong></header><div className="stand-rate"><i style={{ width: `${rate}%` }} /></div><p>{stand.score}/{stand.targets}　失中 {stand.misses}</p><small>失中クレー　←{stand.missDirections.left}　↑{stand.missDirections.center}　→{stand.missDirections.right}</small></article>;
    })}</div></section>
  </section>;
}
