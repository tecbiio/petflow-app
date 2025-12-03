type Props = {
  quantity: number | undefined;
};

function StockBadge({ quantity = 0 }: Props) {
  const isAvailable = quantity > 0;
  const tone = isAvailable ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900";
  const label = isAvailable ? "En stock" : "Rupture";

  return (
    <span className={`pill ${tone}`}>
      {label} • {quantity ?? 0}
    </span>
  );
}

export default StockBadge;
