import { useMemo } from "react";

type Point = {
  date: string;
  quantity: number;
};

type Props = {
  data: Point[];
  height?: number;
};

const PADDING = 16;

function StockChart({ data, height = 180 }: Props) {
  const width = 420;

  const prepared = useMemo(() => {
    if (data.length === 0) return { path: "", points: [] };

    const sorted = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const minDate = new Date(sorted[0].date).getTime();
    const maxDate = new Date(sorted[sorted.length - 1].date).getTime() || minDate + 1;
    const minQty = Math.min(...sorted.map((p) => p.quantity));
    const maxQty = Math.max(...sorted.map((p) => p.quantity));
    const yRange = maxQty - minQty || 1;

    const usableWidth = width - PADDING * 2;
    const usableHeight = height - PADDING * 2;

    const scaledPoints = sorted.map((p) => {
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

  return (
    <div className="rounded-xl border border-ink-100 bg-white p-3 shadow-sm">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Variation de stock">
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
        {prepared.points.map((p, index) => (
          <circle key={p.date + index} cx={p.x} cy={p.y} r={3} fill="#4f46e5" />
        ))}
      </svg>
      <div className="mt-2 flex items-center justify-between text-xs text-ink-600">
        <span>{new Date(data[0].date).toLocaleDateString("fr-FR")}</span>
        <span>{new Date(data[data.length - 1].date).toLocaleDateString("fr-FR")}</span>
      </div>
    </div>
  );
}

export default StockChart;
