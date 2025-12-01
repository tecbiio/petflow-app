import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import StatCard from "../components/StatCard";
import StockBadge from "../components/StockBadge";
import { useProducts } from "../hooks/useProducts";
import { useStockLocations } from "../hooks/useStockLocations";
import { api } from "../api/client";
import { StockMovement } from "../types";

function Dashboard() {
  const [threshold, setThreshold] = useState(10);
  const { data: products = [], isLoading: loadingProducts } = useProducts();
  const { data: locations = [] } = useStockLocations();

  const stockQueries = useQueries({
    queries:
      products?.map((product) => ({
        queryKey: ["stock", product.id],
        queryFn: () => api.getStockForProduct(product.id),
        enabled: products.length > 0,
      })) ?? [],
  });

  const movementQueries = useQueries({
    queries:
      products?.map((product) => ({
        queryKey: ["movements", product.id],
        queryFn: () => api.getMovementsByProduct(product.id),
        enabled: products.length > 0,
      })) ?? [],
  });

  const lowStock = useMemo(() => {
    return products
      .map((p, index) => ({
        product: p,
        quantity: stockQueries[index]?.data?.quantity ?? 0,
      }))
      .filter((item) => item.quantity < (item.product.threshold ?? threshold));
  }, [products, stockQueries, threshold]);

  const recentMovements: StockMovement[] = useMemo(() => {
    const merged = movementQueries.flatMap((mq) => mq.data ?? []);
    return merged.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 6);
  }, [movementQueries]);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-4">
        <StatCard title="Produits" value={loadingProducts ? "…" : products.length} hint="Catalogués" />
        <StatCard title="Emplacements" value={locations.length} hint="Actifs" tone="info" />
        <StatCard
          title="Sous seuil"
          value={lowStock.length}
          hint={`Seuil courant : ${threshold}`}
          tone={lowStock.length > 0 ? "warning" : "default"}
        />
        <StatCard title="Mouvements récents" value={recentMovements.length} hint="24h glissantes" tone="info" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="glass-panel lg:col-span-2 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink-900">Produits sous seuil</h2>
            <label className="text-xs text-ink-600">
              Seuil par défaut
              <input
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="ml-2 w-20 rounded-lg border border-ink-100 px-2 py-1 text-sm"
              />
            </label>
          </div>
          <div className="mt-3 space-y-3">
            {lowStock.length === 0 ? (
              <p className="text-sm text-ink-600">Aucun article sous le seuil configuré.</p>
            ) : (
              lowStock.map(({ product, quantity }) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between rounded-xl border border-ink-100 bg-white px-3 py-3 shadow-sm"
                >
                  <div>
                    <p className="text-sm font-semibold text-ink-900">{product.name}</p>
                    <p className="text-xs text-ink-500">{product.sku}</p>
                  </div>
                  <StockBadge quantity={quantity} threshold={product.threshold ?? threshold} />
                </div>
              ))
            )}
          </div>
        </div>

        <div className="glass-panel p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink-900">Activité récente</h2>
            <span className="pill bg-brand-50 text-brand-700">Mouvements</span>
          </div>
          <div className="mt-3 space-y-3">
            {recentMovements.length === 0 ? (
              <p className="text-sm text-ink-600">Pas encore de mouvement suivi.</p>
            ) : (
              recentMovements.map((move) => (
                <div key={move.id} className="rounded-lg bg-white px-3 py-2 shadow-sm">
                  <p className="text-sm font-semibold text-ink-900">
                    {move.quantity > 0 ? "+" : ""}
                    {move.quantity} • {move.reason || move.type}
                  </p>
                  <p className="text-xs text-ink-500">
                    {new Date(move.createdAt).toLocaleString("fr-FR")} – {move.reference || move.stockLocationId}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
