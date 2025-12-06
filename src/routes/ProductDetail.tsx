import { Link, Navigate, useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useProduct } from "../hooks/useProducts";
import { useProductStock, useProductVariations } from "../hooks/useStock";
import { useMovementsByProduct } from "../hooks/useMovements";
import { useInventoriesByProduct } from "../hooks/useInventories";
import { useStockLocations } from "../hooks/useStockLocations";
import StockBadge from "../components/StockBadge";
import InventoryStatusBadge from "../components/InventoryStatusBadge";
import { api } from "../api/client";
import StockChart from "../components/StockChart";

function ProductDetail() {
  const { productId = "" } = useParams();
  const productNumericId = Number(productId);
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const { data: product, error: productError, isError } = useProduct(productNumericId);
  const { data: stock } = useProductStock(productNumericId);
  const { data: variations = [] } = useProductVariations(productNumericId);
  const { data: movements = [] } = useMovementsByProduct(productNumericId);
  const { data: inventories = [] } = useInventoriesByProduct(productNumericId);
  const { data: locations = [] } = useStockLocations();

  const chartData = useMemo(() => {
    if (!product) return [];

    const sortedVariations = [...variations].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    const sortedInventories = [...inventories].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    const baseInventory = sortedInventories[0];
    const baseQuantity = baseInventory?.quantity ?? 0;
    const baseDate = baseInventory?.createdAt ?? product.createdAt;

    let running = baseQuantity;
    const points = [{ date: baseDate, quantity: running }];

    for (const move of sortedVariations) {
      running += move.quantityDelta;
      points.push({ date: move.createdAt, quantity: running });
    }

    return points;
  }, [inventories, product, variations]);

  const patchProduct = useMutation({
    mutationFn: (isActive: boolean) => api.updateProduct(productNumericId, { isActive }),
    onSuccess: (updated) => {
      setMessage(`Statut mis à jour via PATCH /products/${updated.id}`);
      queryClient.invalidateQueries({ queryKey: ["product", productNumericId] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error: Error) => setMessage(error.message),
  });

  if (!Number.isInteger(productNumericId) || productNumericId <= 0) {
    return <Navigate to="/products" replace />;
  }

  if (isError) {
    return (
      <div className="glass-panel p-4">
        <p className="text-sm text-ink-700">Produit introuvable ou inaccessible.</p>
        <p className="text-xs text-ink-500">{(productError as Error)?.message ?? ""}</p>
        <Link to="/products" className="mt-2 inline-block text-sm font-semibold text-brand-700 underline">
          Retour au catalogue
        </Link>
      </div>
    );
  }

  if (!product) {
    return <p className="text-sm text-ink-600">Chargement…</p>;
  }

  const stockQuantity = stock?.stock ?? 0;
  const hasInventory = inventories.length > 0;

  return (
    <div className="space-y-6">
      <div className="glass-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-500">{product.sku}</p>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-semibold text-ink-900">{product.name}</h2>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  product.isActive ?? true ? "bg-emerald-50 text-emerald-700" : "bg-ink-100 text-ink-700"
                }`}
              >
                {product.isActive ?? true ? "Actif" : "Archivé"}
              </span>
            </div>
            <p className="text-sm text-ink-600">{product.description}</p>
          <p className="mt-2 text-sm font-semibold text-brand-700">
            {Number.isFinite(product.price) ? `${product.price.toFixed(2)} €` : "—"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StockBadge quantity={stock?.stock} />
          {!hasInventory ? (
            <InventoryStatusBadge />
          ) : null}
          <button
            type="button"
            onClick={() => patchProduct.mutate(!(product.isActive ?? true))}
            className="rounded-lg bg-ink-100 px-3 py-2 text-xs font-semibold text-ink-700"
            title={product.isActive ?? true ? "Archiver le produit" : "Réactiver le produit"}
            >
              {product.isActive ?? true ? "Archiver" : "Réactiver"}
            </button>
            <Link
              to="/documents"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-card"
            >
              Ajuster / inventaire
            </Link>
          </div>
        </div>
        {message ? <p className="mt-2 text-xs text-ink-600">{message}</p> : null}
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl bg-white px-3 py-3 shadow-sm">
            <p className="text-xs text-ink-500">Stock actuel</p>
            <div className="mt-1 flex items-center justify-between">
              <p className="text-lg font-semibold text-ink-900">{stockQuantity} unités</p>
              <StockBadge quantity={stockQuantity} />
            </div>
            <p className="text-xs text-ink-500">Synchronisé via mouvements et inventaires.</p>
          </div>
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
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass-panel p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-ink-900">Mouvements</h3>
          </div>
          <div className="mt-3">
            <StockChart data={chartData} />
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
