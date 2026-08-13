import { useState } from "react";
import { calculateRoundStats, calculateRoundWindowComparison, calculateSessionStats, calculateStandStats } from "../domain/shootingStats";
import type { Discipline, FireMode } from "../domain/shooting";
import type { StoredSession } from "../services/storage";
import { getAmmunitionPerformance } from "../services/ammunitionPerformance";
import { getConditionPerformance, type ConditionPerformance } from "../services/conditionPerformance";
import { formatWindDirection } from "../services/sessionConditions";
import { StandRadialChart } from "./StandRadialChart";
import "./HistoryAnalysis.css";
import { useLanguage } from "../i18n/LanguageContext";
import { getTrapSettingPerformance } from "../services/trapSettings";

interface Props { sessions: StoredSession[]; }
type Period = "all" | "5" | "10";
const DEFAULT_DISCIPLINE_KEY = "shoot-log-analysis-default-discipline";

export function HistoryAnalysis({ sessions }: Props) {
  const { language, text } = useLanguage();
  const [discipline, setDiscipline] = useState<Extract<Discipline, "trap" | "skeet">>(() => localStorage.getItem(DEFAULT_DISCIPLINE_KEY) === "skeet" ? "skeet" : "trap");
  const [defaultDiscipline, setDefaultDiscipline] = useState<Extract<Discipline, "trap" | "skeet">>(() => localStorage.getItem(DEFAULT_DISCIPLINE_KEY) === "skeet" ? "skeet" : "trap");
  const [rangeName, setRangeName] = useState("all");
  const [ammunitionName, setAmmunitionName] = useState("all");
  const [fireMode, setFireMode] = useState<"all" | FireMode>("all");
  const [period, setPeriod] = useState<Period>("all");
  const completed = sessions.filter((item) => item.status === "completed" && item.session.discipline === discipline);
  const rangeOptions = [...new Set(completed.map((item) => item.session.rangeName))].sort((a, b) => a.localeCompare(b, "ja"));
  const ammunitionOptions = [...new Set(completed.map((item) => item.session.ammunitionName))].sort((a, b) => a.localeCompare(b, "ja"));

  const matched = completed
    .filter((item) => rangeName === "all" || item.session.rangeName === rangeName)
    .filter((item) => ammunitionName === "all" || item.session.ammunitionName === ammunitionName)
    .sort((a, b) => a.session.date.localeCompare(b.session.date) || a.createdAt.localeCompare(b.createdAt))
    .map((item) => ({ ...item, rounds: fireMode === "all" ? item.rounds : item.rounds.filter((round) => round.fireMode === fireMode) }))
    .filter((item) => item.rounds.length > 0);
  const filtered = period === "all" ? matched : matched.slice(-Number(period));

  if (!sessions.some((item) => item.status === "completed")) return null;
  const rounds = filtered.flatMap((item) => item.rounds);
  const comparisonRounds = matched.flatMap((item) => item.rounds);
  const comparison = calculateRoundWindowComparison(comparisonRounds);
  const totalScore = rounds.reduce((sum, round) => sum + calculateRoundStats(round).score, 0);
  const average = rounds.length ? totalScore / rounds.length : 0;
  const best = rounds.reduce((highest, round) => Math.max(highest, calculateRoundStats(round).score), 0);
  const totalCartridges = filtered.reduce((sum, item) => sum + calculateSessionStats({ id: item.id, date: item.session.date, rangeName: item.session.rangeName, ammunitionName: item.session.ammunitionName, weather: item.session.weather, rounds: item.rounds, sessionMemo: item.session.memo }).cartridgesUsed, 0);
  const stands = calculateStandStats({ id: "history", date: "", rangeName: "", ammunitionName: "", rounds });
  const directionScaleMax = Math.max(1, ...stands.flatMap((stand) => [stand.missDirections.left, stand.missDirections.center, stand.missDirections.right]));
  const ammunitionPerformance = getAmmunitionPerformance(filtered);
  const trapSettingPerformance = discipline === "trap" ? getTrapSettingPerformance(rounds) : [];
  const conditionPerformance = getConditionPerformance(filtered);
  const hasConditionPerformance = conditionPerformance.weather.length > 0 || conditionPerformance.windDirection.length > 0 || conditionPerformance.windStrength.length > 0;
  const houseStats = rounds.flatMap((round) => round.shots).reduce((result, shot) => {
    if (shot.skeetHouse && shot.finalResult !== "skip") {
      result[shot.skeetHouse].targets += 1;
      if (shot.finalResult === "hit-on-first") result[shot.skeetHouse].hits += 1;
    }
    return result;
  }, { high: { hits: 0, targets: 0 }, low: { hits: 0, targets: 0 } });
  const skeetFormatStats = rounds.flatMap((round) => round.shots).reduce((result, shot) => {
    if (shot.finalResult !== "skip") {
      const format = shot.skeetPairId ? "double" : "single";
      result[format].targets += 1;
      if (shot.finalResult === "hit-on-first") result[format].hits += 1;
    }
    return result;
  }, { single: { hits: 0, targets: 0 }, double: { hits: 0, targets: 0 } });
  function chooseDiscipline(value: "trap" | "skeet") {
    setDiscipline(value); setRangeName("all"); setAmmunitionName("all"); setFireMode("all"); setPeriod("all");
  }
  function saveDefaultDiscipline() { localStorage.setItem(DEFAULT_DISCIPLINE_KEY, discipline); setDefaultDiscipline(discipline); }

  return <section className="history-analysis">
    <header><div><p className="eyebrow">PERFORMANCE</p><h2>{text("成長分析", "Performance analysis")}</h2></div><small>{text(`対象セッション ${filtered.length}件`, `${filtered.length} sessions`)}</small></header>
    <section className="discipline-analysis-switch"><div role="group" aria-label={text("分析する種目", "Discipline to analyze")}><button className={discipline === "trap" ? "selected trap" : ""} onClick={() => chooseDiscipline("trap")}>Trap</button><button className={discipline === "skeet" ? "selected skeet" : ""} onClick={() => chooseDiscipline("skeet")}>Skeet</button></div><button className="analysis-default-button" disabled={defaultDiscipline === discipline} onClick={saveDefaultDiscipline}>{defaultDiscipline === discipline ? text("標準表示に設定済み", "Default view") : text("この種目を標準表示", "Make this the default")}</button></section>
    <div className="analysis-filters"><label><span>{text("射撃場", "Range")}</span><select value={rangeName} onChange={(event) => setRangeName(event.target.value)}><option value="all">{text("すべて", "All")}</option>{rangeOptions.map((name) => <option key={name}>{name}</option>)}</select></label><label><span>{text("実包", "Ammunition")}</span><select value={ammunitionName} onChange={(event) => setAmmunitionName(event.target.value)}><option value="all">{text("すべて", "All")}</option>{ammunitionOptions.map((name) => <option key={name}>{name}</option>)}</select></label><label><span>{text("発射方式", "Fire mode")}</span><select value={fireMode} onChange={(event) => setFireMode(event.target.value as "all" | FireMode)}><option value="all">{text("すべて", "All")}</option><option value="single">{text("1発撃ち", "Single shot")}</option><option value="double">{text("2発撃ち", "Two shots")}</option></select></label><label><span>{text("期間", "Period")}</span><select value={period} onChange={(event) => setPeriod(event.target.value as Period)}><option value="all">{text("全期間", "All dates")}</option><option value="5">{text("直近5回", "Last 5")}</option><option value="10">{text("直近10回", "Last 10")}</option></select></label></div>
    {rounds.length === 0 ? <div className="analysis-empty">{text("条件に一致するラウンドがありません。", "No rounds match these filters.")}</div> : <>
      <div className="history-kpis"><article><span>{text("平均スコア", "Average score")}</span><strong>{average.toFixed(1)}<small> / 25</small></strong></article><article><span>{text("最高ラウンド", "Best round")}</span><strong>{best}<small> / 25</small></strong></article><article><span>{text("対象ラウンド", "Rounds")}</span><strong>{rounds.length}<small>R</small></strong></article><article><span>{text("消費実包", "Shells used")}</span><strong>{totalCartridges}</strong></article></div>
      {discipline === "skeet" && <section className="skeet-growth-breakdown"><header><div><p className="eyebrow">SKEET BREAKDOWN</p><h3>{text("ハウス・発射形式別", "By house and target format")}</h3></div><small>{text("入力済みクレーを集計", "Entered targets only")}</small></header><div>{[[text("ハイハウス", "High house"), houseStats.high], [text("ローハウス", "Low house"), houseStats.low], [text("シングル", "Singles"), skeetFormatStats.single], [text("ダブル内クレー", "Targets in doubles"), skeetFormatStats.double]].map(([label, value]) => { const item = value as { hits: number; targets: number }; return <article key={label as string}><span>{label as string}</span><strong>{item.hits}<small> / {item.targets}</small></strong><p>{text("命中率", "Hit rate")} {item.targets ? Math.round(item.hits / item.targets * 100) : 0}%</p></article>; })}</div></section>}
      {hasConditionPerformance && <section className="condition-performance"><header><div><p className="eyebrow">CONDITION PERFORMANCE</p><h3>{text("天候・風別パフォーマンス", "Performance by weather and wind")}</h3></div><small>{text("同じ絞り込み条件で比較", "Compared with the same filters")}</small></header><div className="condition-performance-groups"><ConditionGroup title={text("天候", "Weather")} items={conditionPerformance.weather} /><ConditionGroup title={text("風向", "Wind direction")} items={conditionPerformance.windDirection} formatLabel={(value) => formatWindDirection(value, language)} /><ConditionGroup title={text("風の強さ", "Wind strength")} items={conditionPerformance.windStrength} /></div><p>{text("記録数が少ない条件は参考値です。射撃場・実包・練習テーマなど、ほかの違いも含めて判断してください。", "Conditions with few records are indicative only. Consider other differences such as range, ammunition, and practice focus.")}</p></section>}
      {ammunitionPerformance.length > 0 && <section className="ammunition-performance"><header><div><p className="eyebrow">AMMUNITION PERFORMANCE</p><h3>{text("実包別パフォーマンス", "Performance by ammunition")}</h3></div><small>{text("同じ絞り込み条件で比較", "Compared with the same filters")}</small></header><div>{ammunitionPerformance.map((item) => <article key={item.ammunitionName}><header><strong>{item.ammunitionName}</strong>{item.roundCount < 3 && <span>{text("参考値", "Indicative")}</span>}</header><div><p><span>{text("平均", "Average")}</span><strong>{item.averageScore.toFixed(1)}<small> / 25</small></strong></p><p><span>{text("命中率", "Hit rate")}</span><strong>{item.hitRate.toFixed(1)}<small>%</small></strong></p><p><span>{text("初矢", "First shot")}</span><strong>{item.firstShotHitRate.toFixed(1)}<small>%</small></strong></p></div><small>{text(`${item.sessionCount}セッション・${item.roundCount}ラウンド`, `${item.sessionCount} sessions · ${item.roundCount} rounds`)}</small></article>)}</div><p>{text("ラウンド数が少ない実包は「参考値」として表示します。射撃場や天候などの条件差も含めて判断してください。", "Ammunition with few rounds is marked indicative. Consider differences in range, weather, and other conditions.")}</p></section>}
      <section className={`performance-comparison${comparison ? "" : " is-pending"}`}>
        <header><div><p className="eyebrow">RECENT COMPARISON</p><h3>{text("直近5ラウンド比較", "Last 5 rounds")}</h3></div><small>{text("同じ絞り込み条件で、その前5ラウンドと比較", "Compared with the previous 5 rounds using the same filters")}</small></header>
        {comparison ? <div className="comparison-grid">
          <article><span>{text("平均スコア", "Average score")}</span><strong>{comparison.recent.averageScore.toFixed(1)}<small> / 25</small></strong><p className={deltaClass(comparison.averageScoreDelta)}>{formatDelta(comparison.averageScoreDelta, "")}</p><small>{text("前5R", "Previous 5R")} {comparison.previous.averageScore.toFixed(1)}</small></article>
          <article><span>{text("初矢命中率", "First-shot hit rate")}</span><strong>{comparison.recent.firstShotHitRate.toFixed(1)}<small>%</small></strong><p className={deltaClass(comparison.firstShotHitRateDelta)}>{formatDelta(comparison.firstShotHitRateDelta, "pt")}</p><small>{text("前5R", "Previous 5R")} {comparison.previous.firstShotHitRate.toFixed(1)}%</small></article>
          <article><span>{text("現在の課題射台", "Current weakest stand")}</span><strong>{comparison.weakestStand.standNo}<small>{text("番射台", " stand")}</small></strong><p>{text("命中率", "Hit rate")} {comparison.weakestStand.hitRate.toFixed(1)}%</p><small className={deltaClass(comparison.weakestStand.delta)}>{text("前5R比", "vs previous 5R")} {formatDelta(comparison.weakestStand.delta, "pt")}</small></article>
        </div> : <div className="comparison-pending"><strong>{text(`比較まであと ${Math.max(0, 10 - comparisonRounds.length)}R`, `${Math.max(0, 10 - comparisonRounds.length)}R until comparison`)}</strong><p>{text("同じ条件の記録が10ラウンドになると、直近5Rの変化を表示します。", "After 10 rounds with the same filters, changes in the latest 5 rounds will appear.")}</p></div>}
      </section>
      <section className="score-trend"><h3>{text("セッション推移", "Session trend")}</h3><div className="trend-scroll"><div className="trend-bars">{filtered.map((item) => {
        const score = item.rounds.reduce((sum, round) => sum + calculateRoundStats(round).score, 0);
        const sessionAverage = score / item.rounds.length;
        return <article key={item.id}><div className="trend-value">{sessionAverage.toFixed(1)}</div><div className="trend-track"><div style={{ height: `${sessionAverage / 25 * 100}%` }} /></div><strong>{item.session.date.slice(5)}</strong><small>{item.rounds.length}R</small></article>;
      })}</div></div></section>
      <section className="history-stands"><header><h3>{text("射台別成績", "Performance by stand")}</h3><div className="radial-legend"><span><i className="legend-hit" />{text("総合命中率", "Hit rate")}</span><span><i className="legend-first" />{text("初矢命中率", "First-shot rate")}</span><span><i className="legend-left" />←{text("失中", "Miss")}</span><span><i className="legend-center" />↑{text("失中", "Miss")}</span><span><i className="legend-right" />→{text("失中", "Miss")}</span></div></header><div>{stands.map((stand) => <StandRadialChart directionScaleMax={directionScaleMax} key={stand.standNo} stats={stand} />)}</div></section>
      {trapSettingPerformance.length > 0 && <section className="trap-setting-performance"><header><div><p className="eyebrow">TARGET SETTING</p><h3>{text("射面・クレー設定別", "By field and target setting")}</h3></div><small>{text("設定済みラウンドのみ", "Rounds with settings only")}</small></header><div>{trapSettingPerformance.map((item) => <article key={item.key}><header><strong>{item.label}</strong>{item.rounds < 3 && <span>{text("参考値", "Indicative")}</span>}</header><p><b>{item.averageScore.toFixed(1)}</b><small> / 25</small></p><footer><span>{[item.distanceMeters ? `${item.distanceMeters}m` : "", item.speedKmh ? `${item.speedKmh}km/h` : ""].filter(Boolean).join("・") || text("数値未設定", "No values")}</span><span>{item.rounds}R</span></footer></article>)}</div><p>{text("射面の設定は変更される場合があります。記録した当日の条件として比較してください。", "Target settings may change. Compare them as conditions recorded for that day.")}</p></section>}
    </>}
  </section>;
}

function ConditionGroup({ title, items, formatLabel = (value) => value }: { title: string; items: ConditionPerformance[]; formatLabel?: (value: string) => string }) {
  const { text } = useLanguage();
  if (items.length === 0) return null;
  return <section><h4>{title}</h4><div>{items.map((item) => <article key={item.condition}><header><strong>{formatLabel(item.condition)}</strong>{item.roundCount < 3 && <span>{text("参考値", "Indicative")}</span>}</header><p><b>{item.averageScore.toFixed(1)}</b><small> / 25</small></p><footer><span>{text("命中率", "Hit rate")} {item.hitRate.toFixed(1)}%</span><span>{text(`${item.sessionCount}回`, `${item.sessionCount} sessions`)}・{item.roundCount}R</span></footer></article>)}</div></section>;
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
