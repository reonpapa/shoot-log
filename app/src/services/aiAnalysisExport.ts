import { calculateRoundStats, calculateSessionHalfComparison, calculateSessionStats, calculateStandStats } from "../domain/shootingStats";
import type { StoredSession } from "./storage";
import { formatShootingConditions } from "./sessionConditions";

export function createAiAnalysisPrompt(session: StoredSession): string {
  const shootingSession = { id: session.id, date: "", rangeName: "", ammunitionName: session.session.ammunitionName, rounds: session.rounds };
  const stats = calculateSessionStats(shootingSession);
  const stands = calculateStandStats(shootingSession).filter((stand) => stand.targets > 0);
  const half = calculateSessionHalfComparison(session.rounds);
  const conditions = formatShootingConditions(session.session);
  const hitRate = stats.targets ? stats.score / stats.targets * 100 : 0;
  const firstShotRate = stats.targets ? stats.firstShotHits / stats.targets * 100 : 0;
  const modeSummaries = (["single", "double"] as const).flatMap((mode) => {
    const matching = session.rounds.filter((round) => round.fireMode === mode);
    if (matching.length === 0) return [];
    const results = matching.map(calculateRoundStats);
    const score = results.reduce((sum, item) => sum + item.score, 0);
    const targets = results.reduce((sum, item) => sum + item.targets, 0);
    const firstShotHits = results.reduce((sum, item) => sum + item.firstShotHits, 0);
    const secondShotHits = results.reduce((sum, item) => sum + item.secondShotHits, 0);
    return [`${mode === "single" ? "1発撃ち" : "2発撃ち"}：${matching.length}R、${score}/${targets}（命中率 ${formatRate(score, targets)}%、初矢 ${firstShotHits}${mode === "double" ? `、二の矢 ${secondShotHits}` : ""}）`];
  });

  return [
    "以下のクレー射撃記録を分析してください。",
    "数値から読み取れる傾向を簡潔に説明し、次回の練習テーマを1つ、具体的な確認ポイントを3つ提案してください。",
    "回答は日本語で、断定しすぎず、安全を最優先にしてください。",
    "失中方向は、失中したクレーの飛翔方向です。弾が外れた方向や照準位置ではありません。",
    "クレーの飛翔方向から照準のずれ、銃口位置、上下の失中を推測せず、記録されていない原因は断定しないでください。",
    "1発撃ちでは唯一の発射による命中を初矢命中として記録しています。1発撃ちと2発撃ちを同じ条件として単純比較しないでください。",
    "",
    `種目：${session.session.discipline.toUpperCase()}`,
    `ラウンド数：${session.rounds.length}`,
    `総合スコア：${stats.score}/${stats.targets}（命中率 ${hitRate.toFixed(1)}%）`,
    `初矢命中：${stats.firstShotHits}（${firstShotRate.toFixed(1)}%）`,
    `二の矢命中：${stats.secondShotHits}`,
    `失中：${stats.misses}`,
    `失中したクレーの飛翔方向：左 ${stats.missDirections.left}、ストレート ${stats.missDirections.center}、右 ${stats.missDirections.right}、不明 ${stats.missDirections.unknown}`,
    `ラウンド別：${session.rounds.map((round) => { const item = calculateRoundStats(round); return `R${round.roundNo} ${round.fireMode === "single" ? "1発撃ち" : "2発撃ち"} ${item.score}/${item.targets}`; }).join("、")}`,
    `発射方式別：${modeSummaries.join("、")}`,
    `射台別：${stands.map((stand) => `Stand ${stand.standNo} ${stand.score}/${stand.targets}（初矢${stand.firstShotHits}・二の矢${stand.secondShotHits}・失中${stand.misses}）`).join("、")}`,
    ...(half ? [`前半平均：${half.first.averageScore.toFixed(1)}/25、後半平均：${half.second.averageScore.toFixed(1)}/25、後半の命中率変化：${formatDelta(half.hitRateDelta)}pt`] : []),
    ...(conditions ? [`コンディション：${conditions}`] : []),
    "",
    "※日付、射撃場、銃番号、氏名、自由記述は含まれていません。",
  ].join("\n");
}

function formatDelta(value: number): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}`;
}

function formatRate(score: number, targets: number): string {
  return (targets ? score / targets * 100 : 0).toFixed(1);
}
