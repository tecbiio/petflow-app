import { useMemo } from "react";
import TimeSeriesLineChart from "./TimeSeriesLineChart";

type Props = {
  data: Array<{ date: string; quantity: number }>;
  height?: number;
  threshold?: number;
};

function StockChart({ data, height = 180, threshold }: Props) {
  if (data.length === 0) {
    return <p className="text-sm text-ink-600">Pas de variations disponibles.</p>;
  }

  const sorted = useMemo(
    () => [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [data],
  );
  const points = useMemo(() => sorted.map((p) => ({ date: p.date, value: p.quantity })), [sorted]);
  const startLabel = sorted.length > 0 ? new Date(sorted[0].date).toLocaleDateString("fr-FR") : "";
  const endLabel =
    sorted.length > 0 ? new Date(sorted[sorted.length - 1].date).toLocaleDateString("fr-FR") : "";

  return (
    <div className="card p-3">
      <TimeSeriesLineChart
        points={points}
        height={height}
        threshold={threshold}
        showPointLabels
        ariaLabel="Variation de stock"
        svgClassName="w-full"
        svgStyle={{ height }}
        formatPointLabel={(p) => String(p.value)}
        formatTooltipTitle={(p) => `${p.value} unités`}
        formatTooltipSubtitle={(p) => new Date(p.date).toLocaleString("fr-FR")}
      />
      <div className="mt-2 flex items-center justify-between text-xs text-ink-600">
        <span>{startLabel}</span>
        <span>{endLabel}</span>
      </div>
    </div>
  );
}

export default StockChart;
