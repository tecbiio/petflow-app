import { Link } from "react-router-dom";
import { Product } from "../types";
import StockBadge from "./StockBadge";
import InventoryStatusBadge from "./InventoryStatusBadge";

type Props = {
  product: Product;
  stock?: number;
  inventoryMissing?: boolean;
};

function ProductCard({ product, stock = 0, inventoryMissing }: Props) {
  return (
    <Link
      to={`/products/${product.id}`}
      className="glass-panel flex flex-col gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-xl"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm text-ink-500">{product.sku}</p>
          <p className="text-lg font-semibold text-ink-900">{product.name}</p>
          {inventoryMissing ? (
            <InventoryStatusBadge />
          ) : null}
        </div>
        <StockBadge quantity={stock} />
      </div>
      <p className="text-sm text-ink-600 line-clamp-2">{product.description}</p>
      <p className="text-sm font-semibold text-brand-700">
        {Number.isFinite(product.price) ? `${product.price.toFixed(2)} €` : "—"}
      </p>
    </Link>
  );
}

export default ProductCard;
