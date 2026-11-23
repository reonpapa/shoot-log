import { useCallback, useEffect, useRef, useState } from "react";
import "./Charts.css";
import { useLanguage } from "../i18n/LanguageContext";

/** 描画幅を実寸で測る。SVGを引き伸ばすと文字まで伸びるため、実寸で組む。 */
function useElementWidth<T extends HTMLElement>(fallback: number): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const next = Math.round(entries[0]?.contentRect.width ?? fallback);
      if (next > 0) setWidth(next);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [fallback]);
  return [ref, width];
}

export interface LineSeries {
  name: string;
  /** 1本目は violet、2本目は orange。並び順で色が決まる。 */
  values: (number | null)[];
}

interface LineChartProps {
  labels: string[];
  series: LineSeries[];
  formatValue: (value: number) => string;
  /** 目盛の上限・下限。省略時はデータから決める。 */
  min?: number;
  max?: number;
  /** 表形式の見出し（アクセシビリティ用の代替表示）。 */
  tableLabel: string;
  description: string;
}

const PADDING = { top: 12, right: 14, bottom: 26, left: 40 };
const HEIGHT = 190;

/** 推移を見る折れ線。系列は最大2本。 */
export function TrendLineChart({ labels, series, formatValue, min, max, tableLabel, description }: LineChartProps) {
  const { text } = useLanguage();
  const [wrapRef, width] = useElementWidth<HTMLDivElement>(320);
  const [active, setActive] = useState<number | null>(null);

  const numbers = series.flatMap((item) => item.values).filter((value): value is number => value !== null);
  const lowest = min ?? (numbers.length ? Math.min(...numbers) : 0);
  const highest = max ?? (numbers.length ? Math.max(...numbers) : 1);
  const span = highest - lowest || 1;
  const plotWidth = Math.max(80, width - PADDING.left - PADDING.right);
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const x = (index: number) => PADDING.left + (labels.length <= 1 ? plotWidth / 2 : (plotWidth * index) / (labels.length - 1));
  const y = (value: number) => PADDING.top + plotHeight - ((value - lowest) / span) * plotHeight;
  const ticks = [lowest, lowest + span / 2, highest];

  const pick = useCallback((clientX: number) => {
    const element = wrapRef.current;
    if (!element || labels.length === 0) return;
    const bounds = element.getBoundingClientRect();
    const ratio = (clientX - bounds.left - PADDING.left) / plotWidth;
    setActive(Math.max(0, Math.min(labels.length - 1, Math.round(ratio * (labels.length - 1)))));
  }, [labels.length, plotWidth, wrapRef]);

  function keyDown(event: React.KeyboardEvent) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    setActive((current) => {
      const base = current ?? labels.length - 1;
      return Math.max(0, Math.min(labels.length - 1, base + (event.key === "ArrowRight" ? 1 : -1)));
    });
  }

  if (labels.length === 0) return null;
  const tooltipIndex = active ?? null;

  return <div className="chart">
    <div
      className="chart-plot"
      ref={wrapRef}
      tabIndex={0}
      role="application"
      aria-label={description}
      onKeyDown={keyDown}
      onPointerMove={(event) => pick(event.clientX)}
      onPointerDown={(event) => pick(event.clientX)}
      onPointerLeave={() => setActive(null)}
      onBlur={() => setActive(null)}
    >
      <svg height={HEIGHT} width={width} role="presentation">
        {ticks.map((tick) => <g key={tick}>
          <line className="chart-grid" x1={PADDING.left} x2={PADDING.left + plotWidth} y1={y(tick)} y2={y(tick)} />
          <text className="chart-axis-label" dominantBaseline="middle" textAnchor="end" x={PADDING.left - 6} y={y(tick)}>{formatValue(tick)}</text>
        </g>)}
        {tooltipIndex !== null && <line className="chart-crosshair" x1={x(tooltipIndex)} x2={x(tooltipIndex)} y1={PADDING.top} y2={PADDING.top + plotHeight} />}
        {series.map((item, seriesIndex) => {
          const segments: string[] = [];
          let open = false;
          item.values.forEach((value, index) => {
            if (value === null) { open = false; return; }
            segments.push(`${open ? "L" : "M"} ${x(index)} ${y(value)}`);
            open = true;
          });
          return <path className={`chart-line series-${seriesIndex + 1}`} d={segments.join(" ")} key={item.name} />;
        })}
        {series.map((item, seriesIndex) => item.values.map((value, index) => value === null || (labels.length > 14 && index !== item.values.length - 1 && index !== tooltipIndex) ? null
          : <circle className={`chart-dot series-${seriesIndex + 1}`} cx={x(index)} cy={y(value)} key={`${item.name}-${index}`} r={index === tooltipIndex ? 5 : 4} />))}
        <text className="chart-axis-label" textAnchor="start" x={PADDING.left} y={HEIGHT - 8}>{labels[0]}</text>
        {labels.length > 1 && <text className="chart-axis-label" textAnchor="end" x={PADDING.left + plotWidth} y={HEIGHT - 8}>{labels[labels.length - 1]}</text>}
      </svg>
      {tooltipIndex !== null && <div className="chart-tooltip" style={{ left: `${Math.min(Math.max(x(tooltipIndex), 70), width - 70)}px` }}>
        <strong>{labels[tooltipIndex]}</strong>
        {series.map((item, seriesIndex) => <span key={item.name}><i className={`series-${seriesIndex + 1}`} />{item.name}<b>{item.values[tooltipIndex] === null ? "—" : formatValue(item.values[tooltipIndex] as number)}</b></span>)}
      </div>}
    </div>
    {series.length > 1 && <ul className="chart-legend">{series.map((item, seriesIndex) => <li key={item.name}><i className={`series-${seriesIndex + 1}`} />{item.name}</li>)}</ul>}
    <details className="chart-table">
      <summary>{text("数値で見る", "View as table")}</summary>
      <div className="chart-table-wrap"><table><thead><tr><th>{tableLabel}</th>{series.map((item) => <th key={item.name}>{item.name}</th>)}</tr></thead>
        <tbody>{labels.map((label, index) => <tr key={label + index}><td>{label}</td>{series.map((item) => <td key={item.name}>{item.values[index] === null ? "—" : formatValue(item.values[index] as number)}</td>)}</tr>)}</tbody></table></div>
    </details>
  </div>;
}

export interface BarDatum {
  label: string;
  value: number;
  /** 補足（回数など）。バーの横に小さく出す。 */
  note?: string;
}

interface BarChartProps {
  data: BarDatum[];
  formatValue: (value: number) => string;
  tableLabel: string;
  description: string;
}

/** 量を比べる横棒。1系列のみ。 */
export function ComparisonBarChart({ data, formatValue, tableLabel, description }: BarChartProps) {
  const { text } = useLanguage();
  const highest = Math.max(1, ...data.map((item) => item.value));
  if (data.length === 0) return null;
  return <div className="chart">
    <ul className="chart-bars" aria-label={description}>
      {data.map((item) => <li key={item.label}>
        <span className="chart-bar-label">{item.label}</span>
        <span className="chart-bar-track">{item.value > 0 && <span className="chart-bar-fill" style={{ width: `${Math.max(1.5, (item.value / highest) * 100)}%` }} />}</span>
        <b className="chart-bar-value">{formatValue(item.value)}{item.note && <small>{item.note}</small>}</b>
      </li>)}
    </ul>
    <details className="chart-table">
      <summary>{text("数値で見る", "View as table")}</summary>
      <div className="chart-table-wrap"><table><thead><tr><th>{tableLabel}</th><th>{text("値", "Value")}</th></tr></thead>
        <tbody>{data.map((item) => <tr key={item.label}><td>{item.label}</td><td>{formatValue(item.value)}{item.note ? `・${item.note}` : ""}</td></tr>)}</tbody></table></div>
    </details>
  </div>;
}
