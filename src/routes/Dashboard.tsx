import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import StatCard from "../components/StatCard";
import StockBadge from "../components/StockBadge";
import { useProducts } from "../hooks/useProducts";
import { useStockLocations } from "../hooks/useStockLocations";
import { api } from "../api/client";
import { StockMovement } from "../types";
import logo from "../assets/petflow-logo.svg";

function Dashboard() {
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

  const totalStock = useMemo(
    () => stockQueries.reduce((sum, query) => sum + (query.data?.stock ?? 0), 0),
    [stockQueries],
  );

  const lowestStock = useMemo(() => {
    return products
      .map((p, index) => ({
        product: p,
        quantity: stockQueries[index]?.data?.stock ?? 0,
      }))
      .sort((a, b) => a.quantity - b.quantity)
      .slice(0, 5);
  }, [products, stockQueries]);

  const recentMovements: StockMovement[] = useMemo(() => {
    const merged = movementQueries.flatMap((mq) => mq.data ?? []);
    return merged.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 6);
  }, [movementQueries]);

  return (
    <div className="space-y-6">
      <div className="glass-panel flex flex-wrap items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-brand-100">
            <img src={logo} alt="PetFlow" className="h-full w-full object-contain" />
          </div>
          <div>
            <p className="text-sm uppercase tracking-wide text-ink-500">Tableau principal</p>
            <p className="text-lg font-semibold text-ink-900">Pilotage des flux en un coup d'oeil</p>
          </div>
        </div>
        <p className="text-xs text-ink-500">
          Synthèse produits, emplacements et derniers mouvements issus du core PetFlow.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <StatCard title="Produits" value={loadingProducts ? "…" : products.length} hint="Catalogués" />
        <StatCard title="Emplacements" value={locations.length} hint="Actifs" tone="info" />
        <StatCard
          title="Stock total"
          value={totalStock}
          hint="Unités suivies"
          tone={totalStock === 0 ? "warning" : "default"}
        />
        <StatCard title="Mouvements récents" value={recentMovements.length} hint="24h glissantes" tone="info" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="glass-panel lg:col-span-2 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink-900">Stocks les plus bas</h2>
            <span className="pill bg-ink-100 text-ink-700">Classement par quantité</span>
          </div>
          <div className="mt-3 space-y-3">
            {lowestStock.length === 0 ? (
              <p className="text-sm text-ink-600">Aucun article suivi pour l'instant.</p>
            ) : (
              lowestStock.map(({ product, quantity }) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between rounded-xl border border-ink-100 bg-white px-3 py-3 shadow-sm"
                >
                  <div>
                    <p className="text-sm font-semibold text-ink-900">{product.name}</p>
                    <p className="text-xs text-ink-500">{product.sku}</p>
                  </div>
                  <StockBadge quantity={quantity} />
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
                    {move.quantityDelta > 0 ? "+" : ""}
                    {move.quantityDelta} • {move.reason}
                  </p>
                  <p className="text-xs text-ink-500">
                    {new Date(move.createdAt).toLocaleString("fr-FR")} – emplacement #{move.stockLocationId}
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
