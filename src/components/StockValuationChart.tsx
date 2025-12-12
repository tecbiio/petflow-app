import { useMemo } from "react";
import { StockValuationPoint } from "../types";

type Props = {
  points: StockValuationPoint[];
  loading?: boolean;
  locationLabel: string;
};

const currency = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

function StockValuationChart({ points, loading, locationLabel }: Props) {
  const normalized = useMemo(() => {
    const sorted = [...points].sort(
      (a, b) => new Date(a.valuationDate).getTime() - new Date(b.valuationDate).getTime(),
    );
    return sorted.map((p) => ({
      date: new Date(p.valuationDate),
      value: p.totalValueCts / 100,
      persisted: p.persisted,
    }));
  }, [points]);

  const last = normalized[normalized.length - 1];
  const prev = normalized[normalized.length - 2];
  const delta = last && prev ? last.value - prev.value : 0;

  const chart = useMemo(() => {
    if (normalized.length === 0) return null;
    const values = normalized.map((p) => p.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const padding = maxVal === minVal ? maxVal * 0.05 || 1 : (maxVal - minVal) * 0.1;
    const yMin = Math.max(0, minVal - padding);
    const yMax = maxVal + padding;
    const range = yMax - yMin || 1;
    const width = 100;
    const height = 40;
    const step = normalized.length > 1 ? width / (normalized.length - 1) : width;

    const polyline = normalized
      .map((p, idx) => {
        const x = idx * step;
        const y = height - ((p.value - yMin) / range) * height;
        return `${x},${y}`;
      })
      .join(" ");

    const area = `${polyline} ${width},${height} 0,${height}`;

    const ticks = [normalized[0], normalized[Math.max(normalized.length - 1, 0)]].filter(Boolean);

    return {
      polyline,
      area,
      width,
      height,
      ticks: ticks.map((p, idx) => ({
        label: formatDate(p.date),
        x: idx === 0 ? 0 : width,
      })),
      yLabels: [yMin, yMax],
    };
  }, [normalized]);

  const legend =
    last && (
      <div className="flex items-center gap-3">
        <div className="text-2xl font-semibold text-ink-900">{currency.format(last.value)}</div>
        {prev && (
          <span
            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
              delta >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
            }`}
          >
            {delta >= 0 ? "+" : ""}
            {currency.format(delta)}
            <span className="ml-1 text-[11px] font-normal text-ink-500">(vs veille)</span>
          </span>
        )}
        {!last.persisted && <span className="pill bg-amber-50 text-amber-700">Ajour au fil de l'eau</span>}
      </div>
    );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm uppercase tracking-wide text-ink-500">Valorisation du stock</p>
          <p className="text-lg font-semibold text-ink-900">{locationLabel}</p>
        </div>
        {legend}
      </div>

      <div className="relative h-40 w-full overflow-hidden rounded-xl border border-ink-100 bg-white">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-ink-500">Chargement…</div>
        ) : normalized.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-ink-500">Pas encore de données.</div>
        ) : chart ? (
          <svg viewBox={`0 0 ${chart.width} ${chart.height}`} className="h-full w-full">
            <defs>
              <linearGradient id="valuationGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.24" />
                <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.04" />
              </linearGradient>
            </defs>
            <g>
              {chart.yLabels.map((val, idx) => {
                const y = idx === 0 ? chart.height : 0;
                return (
                  <g key={idx}>
                    <line x1="0" y1={y} x2={chart.width} y2={y} stroke="#E5E7EB" strokeWidth="0.5" />
                    <text x="0" y={y - 1} fontSize="3" fill="#6B7280">
                      {currency.format(val)}
                    </text>
                  </g>
                );
              })}
              {chart.ticks.map((tick, idx) => (
                <text key={idx} x={tick.x} y={chart.height} fontSize="3" fill="#6B7280" textAnchor={idx === 0 ? "start" : "end"} dy="6">
                  {tick.label}
                </text>
              ))}
              <polygon points={chart.area} fill="url(#valuationGradient)" />
              <polyline
                points={chart.polyline}
                fill="none"
                stroke="#4f46e5"
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {normalized.map((p, idx) => {
                const x = chart ? idx * (chart.width / Math.max(normalized.length - 1, 1)) : 0;
                const y =
                  chart && chart.yLabels
                    ? chart.height - ((p.value - chart.yLabels[0]) / (chart.yLabels[1] - chart.yLabels[0] || 1)) * chart.height
                    : 0;
                return <circle key={idx} cx={x} cy={y} r={1.2} fill="#312E81" opacity={0.9} />;
              })}
            </g>
          </svg>
        ) : null}
      </div>
    </div>
  );
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

export default StockValuationChart;
