import { Link, useParams } from "react-router-dom";
import { useProduct } from "../hooks/useProducts";
import { useProductStock, useProductVariations } from "../hooks/useStock";
import { useMovementsByProduct } from "../hooks/useMovements";
import { useInventoriesByProduct } from "../hooks/useInventories";
import { useStockLocations } from "../hooks/useStockLocations";
import StockBadge from "../components/StockBadge";

const DEFAULT_THRESHOLD = 10;

function ProductDetail() {
  const { productId = "" } = useParams();
  const productNumericId = Number(productId);
  const { data: product } = useProduct(productNumericId);
  const { data: stock } = useProductStock(productNumericId);
  const { data: variations = [] } = useProductVariations(productNumericId);
  const { data: movements = [] } = useMovementsByProduct(productNumericId);
  const { data: inventories = [] } = useInventoriesByProduct(productNumericId);
  const { data: locations = [] } = useStockLocations();

  if (!product) {
    return <p className="text-sm text-ink-600">Produit introuvable.</p>;
  }

  const threshold = DEFAULT_THRESHOLD;
  const stockQuantity = stock?.stock ?? 0;
  const ratio = threshold ? Math.min(1, stockQuantity / threshold) : 1;

  return (
    <div className="space-y-6">
      <div className="glass-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-500">{product.sku}</p>
            <h2 className="text-2xl font-semibold text-ink-900">{product.name}</h2>
            <p className="text-sm text-ink-600">{product.description}</p>
            <p className="mt-2 text-sm font-semibold text-brand-700">
              {Number.isFinite(product.price) ? `${product.price.toFixed(2)} €` : "—"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StockBadge quantity={stock?.stock} threshold={threshold} />
            <Link
              to="/adjustments"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-card"
            >
              Ajuster / inventaire
            </Link>
          </div>
        </div>
        <div className="mt-4">
          <p className="text-xs text-ink-500">Stock vs seuil</p>
          <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-ink-100">
            <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-700 transition-all" style={{ width: `${ratio * 100}%` }} />
          </div>
          <p className="mt-1 text-xs text-ink-600">
            {stockQuantity} unités disponibles – seuil {threshold}
          </p>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl bg-white px-3 py-3 shadow-sm">
            <p className="text-xs text-ink-500">Dernier inventaire</p>
            <p className="text-lg font-semibold text-ink-900">
              {inventories[0]?.quantity ?? "—"} unités
            </p>
            <p className="text-xs text-ink-500">
              {inventories[0] ? new Date(inventories[0].createdAt).toLocaleString("fr-FR") : "Aucun inventaire"}
            </p>
          </div>
          <div className="rounded-xl bg-white px-3 py-3 shadow-sm">
            <p className="text-xs text-ink-500">Emplacement par défaut</p>
            <p className="text-lg font-semibold text-ink-900">
              {locations.find((l) => l.isDefault)?.name ?? "Non défini"}
            </p>
            <p className="text-xs text-ink-500">{locations.length} emplacements</p>
          </div>
          <div className="rounded-xl bg-white px-3 py-3 shadow-sm">
            <p className="text-xs text-ink-500">Variations suivies</p>
            <p className="text-lg font-semibold text-ink-900">{variations.length}</p>
            <p className="text-xs text-ink-500">/stock/:id/variations</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass-panel p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-ink-900">Mouvements</h3>
            <span className="pill bg-brand-50 text-brand-700">/stock-movements/product/:id</span>
          </div>
          <div className="mt-3 space-y-2">
            {movements.length === 0 ? (
              <p className="text-sm text-ink-600">Pas encore de mouvements.</p>
            ) : (
              movements.map((move) => (
                <div key={move.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 shadow-sm">
                  <div>
                    <p className="text-sm font-semibold text-ink-900">
                      {move.quantityDelta > 0 ? "+" : ""}
                      {move.quantityDelta} unités
                    </p>
                    <p className="text-xs text-ink-500">{move.reason}</p>
                  </div>
                  <p className="text-xs text-ink-500">{new Date(move.createdAt).toLocaleString("fr-FR")}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="glass-panel p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-ink-900">Variations</h3>
            <span className="pill bg-ink-100 text-ink-700">/stock/:id/variations</span>
          </div>
          <div className="mt-3 space-y-2">
            {variations.length === 0 ? (
              <p className="text-sm text-ink-600">Aucune variation.</p>
            ) : (
              variations.map((variation) => (
                <div key={variation.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 shadow-sm">
                  <div>
                    <p className="text-sm font-semibold text-ink-900">
                      {variation.quantityDelta > 0 ? "+" : ""}
                      {variation.quantityDelta} unités
                    </p>
                    <p className="text-xs text-ink-500">{variation.reason || variation.stockLocationId}</p>
                  </div>
                  <p className="text-xs text-ink-500">{new Date(variation.createdAt).toLocaleString("fr-FR")}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="glass-panel p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-ink-900">Inventaires</h3>
          <span className="pill bg-brand-50 text-brand-700">/inventories/product/:id</span>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {inventories.length === 0 ? (
            <p className="text-sm text-ink-600">Aucun inventaire pour ce produit.</p>
          ) : (
            inventories.map((inv) => (
              <div key={inv.id} className="rounded-lg bg-white px-3 py-2 shadow-sm">
                <p className="text-sm font-semibold text-ink-900">
                  {inv.quantity} unités
                </p>
                <p className="text-xs text-ink-500">
                  {new Date(inv.createdAt).toLocaleString("fr-FR")} – {inv.stockLocationId}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductDetail;
