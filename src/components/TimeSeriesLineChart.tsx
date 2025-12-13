import { useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type TimeSeriesPoint<TMeta = unknown> = {
  date: string;
  value: number;
  meta?: TMeta;
};

type ScaledPoint<TMeta = unknown> = TimeSeriesPoint<TMeta> & {
  x: number;
  y: number;
};

type Props<TMeta = unknown> = {
  points: TimeSeriesPoint<TMeta>[];
  width?: number;
  height?: number;
  padding?: number;
  ariaLabel?: string;
  svgClassName?: string;
  svgStyle?: React.CSSProperties;
  threshold?: number;
  showPointLabels?: boolean;
  yPaddingRatio?: number;
  flatlinePaddingRatio?: number;
  clampYMinToZero?: boolean;
  showMinMaxYLabels?: boolean;
  showStartEndXTicks?: boolean;
  formatYLabel?: (value: number) => string;
  formatXLabel?: (date: string) => string;
  formatPointLabel?: (point: TimeSeriesPoint<TMeta>) => string;
  formatTooltipTitle?: (point: TimeSeriesPoint<TMeta>) => string;
  formatTooltipSubtitle?: (point: TimeSeriesPoint<TMeta>) => string;
};

const DEFAULT_WIDTH = 420;
const DEFAULT_HEIGHT = 180;
const DEFAULT_PADDING = 16;

const TOOLTIP_WIDTH = 180;
const TOOLTIP_HEIGHT = 48;

function TimeSeriesLineChart<TMeta,>({
  points,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  padding = DEFAULT_PADDING,
  ariaLabel = "Graphique",
  svgClassName = "w-full",
  svgStyle,
  threshold,
  showPointLabels,
  yPaddingRatio = 0,
  flatlinePaddingRatio = 0.05,
  clampYMinToZero,
  showMinMaxYLabels,
  showStartEndXTicks,
  formatYLabel,
  formatXLabel,
  formatPointLabel,
  formatTooltipTitle,
  formatTooltipSubtitle,
}: Props<TMeta>) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hovered, setHovered] = useState<ScaledPoint<TMeta> | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ left: number; top: number } | null>(null);

  const rawId = useId();
  const gradientId = useMemo(() => `chartGradient-${rawId.replace(/:/g, "")}`, [rawId]);

  const prepared = useMemo(() => {
    const cleaned = points
      .map((p) => ({
        ...p,
        dateMs: new Date(p.date).getTime(),
      }))
      .filter((p) => Number.isFinite(p.value) && Number.isFinite(p.dateMs));

    const sorted = [...cleaned].sort((a, b) => a.dateMs - b.dateMs);
    if (sorted.length === 0) {
      return {
        points: [] as ScaledPoint<TMeta>[],
        domainMin: 0,
        domainMax: 0,
        path: "",
        areaPath: "",
        thresholdY: null as number | null,
      };
    }

    const minDate = sorted[0].dateMs;
    const maxDate = sorted[sorted.length - 1].dateMs;

    let minVal = Math.min(...sorted.map((p) => p.value));
    let maxVal = Math.max(...sorted.map((p) => p.value));
    if (Number.isFinite(threshold)) {
      minVal = Math.min(minVal, threshold as number);
      maxVal = Math.max(maxVal, threshold as number);
    }

    let domainMin = minVal;
    let domainMax = maxVal;
    if (domainMax === domainMin) {
      const delta = Math.abs(domainMax) * flatlinePaddingRatio || 1;
      domainMin -= delta;
      domainMax += delta;
    } else if (yPaddingRatio > 0) {
      const pad = (domainMax - domainMin) * yPaddingRatio;
      domainMin -= pad;
      domainMax += pad;
    }
    if (clampYMinToZero) {
      domainMin = Math.max(0, domainMin);
    }
    if (domainMax <= domainMin) {
      domainMax = domainMin + 1;
    }

    const yRange = domainMax - domainMin || 1;
    const usableWidth = width - padding * 2;
    const usableHeight = height - padding * 2;

    const xFor = (dateMs: number) => {
      if (sorted.length === 1) return width / 2;
      const ratio = (dateMs - minDate) / (maxDate - minDate || 1);
      return padding + ratio * usableWidth;
    };

    const yFor = (value: number) => {
      const ratio = (value - domainMin) / yRange;
      return height - padding - ratio * usableHeight;
    };

    const scaledPoints: ScaledPoint<TMeta>[] = sorted.map((p) => ({
      date: p.date,
      value: p.value,
      meta: p.meta,
      x: xFor(p.dateMs),
      y: yFor(p.value),
    }));

    const path = scaledPoints.reduce((acc, point, index) => `${acc}${index === 0 ? "M" : "L"}${point.x},${point.y} `, "");

    const bottomY = height - padding;
    const areaPath =
      scaledPoints.length === 0
        ? ""
        : `M${scaledPoints[0].x},${bottomY} ${scaledPoints
            .map((p, idx) => `${idx === 0 ? "L" : "L"}${p.x},${p.y}`)
            .join(" ")} L${scaledPoints[scaledPoints.length - 1].x},${bottomY} Z`;

    const thresholdY =
      Number.isFinite(threshold) && typeof threshold === "number" ? yFor(threshold) : null;

    return { points: scaledPoints, domainMin, domainMax, path, areaPath, thresholdY };
  }, [clampYMinToZero, flatlinePaddingRatio, height, padding, points, threshold, width, yPaddingRatio]);

  const strokeWidth = Math.max(0.5, height / 90);
  const pointRadius = Math.max(0.8, height / 56);
  const activePointRadius = pointRadius * 1.6;
  const labelFontSize = Math.max(3, height / 18);

  const formatTooltipTitleFallback = (point: TimeSeriesPoint<TMeta>) => String(point.value);
  const formatTooltipSubtitleFallback = (point: TimeSeriesPoint<TMeta>) =>
    new Date(point.date).toLocaleString("fr-FR");

  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

  const computeTooltipPos = (point: ScaledPoint<TMeta>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const scaleX = rect.width / width;
    const scaleY = rect.height / height;
    const absX = rect.left + point.x * scaleX;
    const absY = rect.top + point.y * scaleY;
    const left = clamp(absX - TOOLTIP_WIDTH / 2, 8, window.innerWidth - TOOLTIP_WIDTH - 8);
    const top = clamp(absY - TOOLTIP_HEIGHT - 12, 8, window.innerHeight - TOOLTIP_HEIGHT - 8);
    return { left, top };
  };

  const hoveredTitle = hovered
    ? (formatTooltipTitle ?? formatTooltipTitleFallback)(hovered)
    : "";
  const hoveredSubtitle = hovered
    ? (formatTooltipSubtitle ?? formatTooltipSubtitleFallback)(hovered)
    : "";

  return (
    <>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={ariaLabel}
        className={svgClassName}
        style={svgStyle}
        onMouseLeave={() => {
          setHovered(null);
          setTooltipPos(null);
        }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
          </linearGradient>
        </defs>

        {showMinMaxYLabels ? (
          <g>
            <line x1="0" y1={height - padding} x2={width} y2={height - padding} stroke="#E5E7EB" strokeWidth={strokeWidth / 4} />
            <text x={padding} y={height - padding - 2} fontSize={labelFontSize} fill="#6B7280">
              {(formatYLabel ?? ((value: number) => String(value)))(prepared.domainMin)}
            </text>

            <line x1="0" y1={padding} x2={width} y2={padding} stroke="#E5E7EB" strokeWidth={strokeWidth / 4} />
            <text x={padding} y={padding + labelFontSize + 2} fontSize={labelFontSize} fill="#6B7280">
              {(formatYLabel ?? ((value: number) => String(value)))(prepared.domainMax)}
            </text>
          </g>
        ) : null}

        {showStartEndXTicks && prepared.points.length > 0 ? (
          <g>
            <text
              x={0}
              y={height}
              fontSize={labelFontSize}
              fill="#6B7280"
              textAnchor="start"
              dy={labelFontSize * 2}
            >
              {(formatXLabel ?? ((date: string) => date))(prepared.points[0].date)}
            </text>
            <text
              x={width}
              y={height}
              fontSize={labelFontSize}
              fill="#6B7280"
              textAnchor="end"
              dy={labelFontSize * 2}
            >
              {(formatXLabel ?? ((date: string) => date))(prepared.points[prepared.points.length - 1].date)}
            </text>
          </g>
        ) : null}

        {prepared.areaPath ? <path d={prepared.areaPath} fill={`url(#${gradientId})`} /> : null}

        {prepared.thresholdY !== null ? (
          <g>
            <line
              x1={padding}
              y1={prepared.thresholdY}
              x2={width - padding}
              y2={prepared.thresholdY}
              stroke="#f59e0b"
              strokeWidth={strokeWidth}
              strokeDasharray={`${strokeWidth * 3} ${strokeWidth * 2}`}
            />
            <text
              x={width - padding}
              y={
                prepared.thresholdY < padding + labelFontSize * 1.4
                  ? prepared.thresholdY + labelFontSize * 1.6
                  : prepared.thresholdY - labelFontSize * 0.6
              }
              textAnchor="end"
              fontSize={labelFontSize}
              fill="#b45309"
            >
              Seuil {threshold}
            </text>
          </g>
        ) : null}

        {prepared.path ? (
          <path d={prepared.path} fill="none" stroke="#4f46e5" strokeWidth={strokeWidth} strokeLinecap="round" />
        ) : null}

        {prepared.points.map((p, index) => {
          const isActive = hovered?.x === p.x && hovered?.y === p.y;
          const label = showPointLabels ? (formatPointLabel ?? ((pt: TimeSeriesPoint<TMeta>) => String(pt.value)))(p) : null;
          const pointTitle = (formatTooltipTitle ?? formatTooltipTitleFallback)(p);
          const pointSubtitle = (formatTooltipSubtitle ?? formatTooltipSubtitleFallback)(p);
          return (
            <g key={p.date + index}>
              <circle
                cx={p.x}
                cy={p.y}
                r={isActive ? activePointRadius : pointRadius}
                fill={isActive ? "#312e81" : "#4f46e5"}
                className="cursor-pointer transition-all"
                onMouseEnter={() => {
                  setHovered(p);
                  setTooltipPos(computeTooltipPos(p));
                }}
                onFocus={() => {
                  setHovered(p);
                  setTooltipPos(computeTooltipPos(p));
                }}
                onBlur={() => {
                  setHovered(null);
                  setTooltipPos(null);
                }}
                tabIndex={0}
              >
                <title>{`${pointTitle} – ${pointSubtitle}`}</title>
              </circle>

              {label ? (
                <text x={p.x} y={p.y - labelFontSize} textAnchor="middle" fontSize={labelFontSize} fill="#1f2937">
                  {label}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>

      {hovered && tooltipPos
        ? createPortal(
            <div
              style={{
                position: "fixed",
                left: tooltipPos.left,
                top: tooltipPos.top,
                width: TOOLTIP_WIDTH,
                pointerEvents: "none",
                zIndex: 9999,
              }}
            >
              <div className="anim-popover-in rounded-xl border border-ink-100 bg-white/95 px-3 py-2 shadow-lg">
                <p className="text-xs font-semibold text-ink-900">{hoveredTitle}</p>
                <p className="text-[11px] text-ink-600">{hoveredSubtitle}</p>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

export default TimeSeriesLineChart;
