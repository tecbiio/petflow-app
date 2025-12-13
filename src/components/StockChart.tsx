import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Point = {
  date: string;
  quantity: number;
};

type ScaledPoint = Point & {
  x: number;
  y: number;
};

type Props = {
  data: Point[];
  height?: number;
};

const PADDING = 16;
const TOOLTIP_WIDTH = 160;
const TOOLTIP_HEIGHT = 44;

function StockChart({ data, height = 180 }: Props) {
  const width = 420;
  const [hovered, setHovered] = useState<ScaledPoint | null>(null);
  const [portalPos, setPortalPos] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const prepared = useMemo(() => {
    if (data.length === 0) return { path: "", points: [] as ScaledPoint[] };

    const sorted = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const minDate = new Date(sorted[0].date).getTime();
    const maxDate = new Date(sorted[sorted.length - 1].date).getTime() || minDate + 1;
    const minQty = Math.min(...sorted.map((p) => p.quantity));
    const maxQty = Math.max(...sorted.map((p) => p.quantity));
    const yRange = maxQty - minQty || 1;

    const usableWidth = width - PADDING * 2;
    const usableHeight = height - PADDING * 2;

    const scaledPoints: ScaledPoint[] = sorted.map((p) => {
      const xRatio = (new Date(p.date).getTime() - minDate) / (maxDate - minDate || 1);
      const yRatio = (p.quantity - minQty) / yRange;
      return {
        x: PADDING + xRatio * usableWidth,
        y: height - PADDING - yRatio * usableHeight,
        quantity: p.quantity,
        date: p.date,
      };
    });

    const path = scaledPoints.reduce(
      (acc, point, index) => `${acc}${index === 0 ? "M" : "L"}${point.x},${point.y} `,
      "",
    );

    return { path, points: scaledPoints };
  }, [data, height, width]);

  if (data.length === 0) {
    return <p className="text-sm text-ink-600">Pas de variations disponibles.</p>;
  }

  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

  const computePortalPos = (point: ScaledPoint) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const scaleX = rect.width / width;
    const scaleY = rect.height / height;
    const absX = rect.left + point.x * scaleX;
    const absY = rect.top + point.y * scaleY;
    return {
      x: clamp(absX, TOOLTIP_WIDTH / 2 + 8, window.innerWidth - TOOLTIP_WIDTH / 2 - 8),
      y: Math.max(absY - TOOLTIP_HEIGHT - 12, 8),
    };
  };

  const hoveredDate = hovered ? new Date(hovered.date).toLocaleString("fr-FR") : "";

  return (
    <div className="card p-3">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Variation de stock"
        width={width}
        height={height}
        onMouseLeave={() => {
          setHovered(null);
          setPortalPos(null);
        }}
      >
        <defs>
          <linearGradient id="stockGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(79, 70, 229, 0.15)" />
            <stop offset="100%" stopColor="rgba(79, 70, 229, 0)" />
          </linearGradient>
        </defs>
        <path
          d={`${prepared.path} L${width - PADDING},${height - PADDING} L${PADDING},${height - PADDING} Z`}
          fill="url(#stockGradient)"
        />
        <path d={prepared.path} fill="none" stroke="#4f46e5" strokeWidth={2} strokeLinecap="round" />
        {prepared.points.map((p, index) => {
          const isActive = hovered?.x === p.x && hovered?.y === p.y;
          return (
            <g key={p.date + index}>
              <circle
                cx={p.x}
                cy={p.y}
                r={isActive ? 5 : 3.2}
                fill={isActive ? "#312e81" : "#4f46e5"}
                className="cursor-pointer transition-all"
                onMouseEnter={() => {
                  setHovered(p);
                  setPortalPos(computePortalPos(p));
                }}
                onFocus={() => {
                  setHovered(p);
                  setPortalPos(computePortalPos(p));
                }}
                onBlur={() => {
                  setHovered(null);
                  setPortalPos(null);
                }}
                tabIndex={0}
              >
                <title>{`Stock: ${p.quantity} – ${new Date(p.date).toLocaleString("fr-FR")}`}</title>
              </circle>
              <text
                x={p.x}
                y={p.y - 8}
                textAnchor="middle"
                fontSize="10"
                fill="#1f2937"
              >
                {p.quantity}
              </text>
            </g>
          );
        })}
      </svg>
      {hovered && portalPos
        ? createPortal(
            <div
              style={{
                position: "fixed",
                left: portalPos.x - TOOLTIP_WIDTH / 2,
                top: portalPos.y - TOOLTIP_HEIGHT,
                width: TOOLTIP_WIDTH,
                pointerEvents: "none",
                zIndex: 9999,
              }}
            >
              <div className="anim-popover-in rounded-xl border border-ink-100 bg-white/95 px-3 py-2 shadow-lg">
                <p className="text-xs font-semibold text-ink-900">{hovered.quantity} unités</p>
                <p className="text-[11px] text-ink-600">{hoveredDate}</p>
              </div>
            </div>,
            document.body,
          )
        : null}
      <div className="mt-2 flex items-center justify-between text-xs text-ink-600">
        <span>{new Date(data[0].date).toLocaleDateString("fr-FR")}</span>
        <span>{new Date(data[data.length - 1].date).toLocaleDateString("fr-FR")}</span>
      </div>
    </div>
  );
}

export default StockChart;
