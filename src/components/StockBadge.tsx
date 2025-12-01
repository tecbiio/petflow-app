type Props = {
  quantity: number | undefined;
  threshold?: number;
};

function StockBadge({ quantity = 0, threshold }: Props) {
  const isLow = threshold !== undefined ? quantity < threshold : quantity <= 0;
  const tone = isLow ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900";
  const label = isLow ? "Sous seuil" : "OK";

  return (
    <span className={`pill ${tone}`}>
      {label} • {quantity}
      {threshold ? ` / seuil ${threshold}` : ""}
    </span>
  );
}

export default StockBadge;
