import type { StandStats } from "../domain/shootingStats";
import "./StandRadialChart.css";

interface Props { stats: StandStats; directionScaleMax: number; }

function sectorPath(value: number, scaleMax: number, startAngle: number, endAngle: number): string {
  if (value <= 0 || scaleMax <= 0) return "";
  const cx = 70;
  const cy = 69;
  const radius = 31 * Math.sqrt(value / scaleMax);
  const point = (angle: number) => ({ x: cx + radius * Math.cos(angle * Math.PI / 180), y: cy + radius * Math.sin(angle * Math.PI / 180) });
  const start = point(startAngle);
  const end = point(endAngle);
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 0 1 ${end.x} ${end.y} Z`;
}

export function StandRadialChart({ stats, directionScaleMax }: Props) {
  const hitRate = stats.targets ? stats.score / stats.targets : 0;
  const firstRate = stats.targets ? stats.firstShotHits / stats.targets : 0;
  const circumferenceOuter = 2 * Math.PI * 54;
  const circumferenceInner = 2 * Math.PI * 44;
  const left = stats.missDirections.left;
  const center = stats.missDirections.center;
  const right = stats.missDirections.right;
  return <article className="stand-radial"><svg viewBox="0 0 140 140" role="img" aria-label={`射台${stats.standNo}、命中率${Math.round(hitRate * 100)}パーセント、初矢命中率${Math.round(firstRate * 100)}パーセント、左失中${left}、中央失中${center}、右失中${right}`}>
    <circle className="radial-track" cx="70" cy="69" r="54" />
    <circle className="radial-hit" cx="70" cy="69" r="54" strokeDasharray={`${circumferenceOuter * hitRate} ${circumferenceOuter}`} />
    <circle className="radial-track inner" cx="70" cy="69" r="44" />
    <circle className="radial-first" cx="70" cy="69" r="44" strokeDasharray={`${circumferenceInner * firstRate} ${circumferenceInner}`} />
    <path className="direction-left" d={sectorPath(left, directionScaleMax, 120, 180)} />
    <path className="direction-center" d={sectorPath(center, directionScaleMax, 60, 120)} />
    <path className="direction-right" d={sectorPath(right, directionScaleMax, 0, 60)} />
    <line className="direction-divider" x1="70" y1="69" x2="54.5" y2="95.8" />
    <line className="direction-divider" x1="70" y1="69" x2="85.5" y2="95.8" />
    <text className="stand-label" x="70" y="54">射台</text><text className="stand-number" x="70" y="68">{stats.standNo}</text>
  </svg><div className="radial-main"><strong>{Math.round(hitRate * 100)}%</strong><span>{stats.score}/{stats.targets}</span></div><div className="radial-directions"><span>← {left}</span><span>↑ {center}</span><span>→ {right}</span></div></article>;
}
