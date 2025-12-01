import { Link } from "react-router-dom";
import { Product } from "../types";
import StockBadge from "./StockBadge";

type Props = {
  product: Product;
  stock?: number;
  onPreview?: (product: Product) => void;
};

const LOW_STOCK_FALLBACK = 5;

function ProductCard({ product, stock = 0, onPreview }: Props) {
  return (
    <div className="glass-panel flex flex-col gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-ink-500">{product.sku}</p>
          <p className="text-lg font-semibold text-ink-900">{product.name}</p>
        </div>
        <StockBadge quantity={stock} threshold={LOW_STOCK_FALLBACK} />
      </div>
      <p className="text-sm text-ink-600 line-clamp-2">{product.description}</p>
      <p className="text-sm font-semibold text-brand-700">{Number.isFinite(product.price) ? `${product.price.toFixed(2)} €` : "—"}</p>
      <div className="mt-auto flex items-center justify-between text-sm font-semibold text-brand-700">
        <button
          type="button"
          onClick={() => onPreview?.(product)}
          className="rounded-lg bg-brand-50 px-3 py-2 text-brand-700 transition hover:bg-brand-100"
        >
          Aperçu rapide
        </button>
        <Link
          to={`/products/${product.id}`}
          className="rounded-lg bg-ink-900 px-3 py-2 text-white transition hover:-translate-y-0.5 hover:shadow-card"
        >
          Détails
        </Link>
      </div>
    </div>
  );
}

export default ProductCard;
