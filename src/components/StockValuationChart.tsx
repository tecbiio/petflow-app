import { useMemo } from "react";
import { StockValuationPoint } from "../types";
import TimeSeriesLineChart from "./TimeSeriesLineChart";

type Props = {
  points: StockValuationPoint[];
  loading?: boolean;
  locationLabel: string;
};

const currency = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

function StockValuationChart({ points, loading, locationLabel }: Props) {
  const normalized = useMemo(
    () =>
      [...points]
        .sort((a, b) => new Date(a.valuationDate).getTime() - new Date(b.valuationDate).getTime())
        .map((p) => ({
          date: p.valuationDate,
          value: p.totalValueCts / 100,
          persisted: p.persisted,
        })),
    [points],
  );

  const last = normalized[normalized.length - 1];
  const prev = normalized[normalized.length - 2];
  const delta = last && prev ? last.value - prev.value : 0;

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

      <div className="card relative h-40 w-full overflow-hidden">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-ink-500">Chargement…</div>
        ) : normalized.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-ink-500">Pas encore de données.</div>
        ) : (
          <TimeSeriesLineChart
            points={normalized.map((p) => ({ date: p.date, value: p.value, meta: { persisted: p.persisted } }))}
            width={100}
            height={40}
            padding={0}
            ariaLabel="Valorisation du stock"
            svgClassName="h-full w-full"
            yPaddingRatio={0.1}
            flatlinePaddingRatio={0.05}
            clampYMinToZero
            showMinMaxYLabels
            showStartEndXTicks
            formatYLabel={(value) => currency.format(value)}
            formatXLabel={(date) => formatDate(new Date(date))}
            formatTooltipTitle={(point) => currency.format(point.value)}
            formatTooltipSubtitle={(point) => {
              const meta = point.meta as { persisted?: boolean } | undefined;
              const extra = meta?.persisted === false ? " · en direct" : "";
              return `${formatDate(new Date(point.date))}${extra}`;
            }}
          />
        )}
      </div>
    </div>
  );
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

export default StockValuationChart;
