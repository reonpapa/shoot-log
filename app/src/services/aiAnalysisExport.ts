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

  return [
    "以下のクレー射撃記録を分析してください。",
    "数値から読み取れる傾向を簡潔に説明し、次回の練習テーマを1つ、具体的な確認ポイントを3つ提案してください。",
    "回答は日本語で、断定しすぎず、安全を最優先にしてください。",
    "",
    `種目：${session.session.discipline.toUpperCase()}`,
    `ラウンド数：${session.rounds.length}`,
    `総合スコア：${stats.score}/${stats.targets}（命中率 ${hitRate.toFixed(1)}%）`,
    `初矢命中：${stats.firstShotHits}（${firstShotRate.toFixed(1)}%）`,
    `二の矢命中：${stats.secondShotHits}`,
    `失中：${stats.misses}`,
    `失中方向：左 ${stats.missDirections.left}、中央 ${stats.missDirections.center}、右 ${stats.missDirections.right}、不明 ${stats.missDirections.unknown}`,
    `ラウンド別：${session.rounds.map((round) => { const item = calculateRoundStats(round); return `R${round.roundNo} ${item.score}/${item.targets}`; }).join("、")}`,
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
