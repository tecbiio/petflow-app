import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import MovementInventoryModal from "../components/MovementInventoryModal";
import StatCard from "../components/StatCard";
import StockBadge from "../components/StockBadge";
import { useProducts } from "../hooks/useProducts";
import { useStockLocations } from "../hooks/useStockLocations";
import { StockMovement, Inventory } from "../types";
import { api } from "../api/client";
import logo from "../assets/petflow-logo.svg";

function Dashboard() {
  const { data: products = [], isLoading: loadingProducts } = useProducts();
  const { data: locations = [] } = useStockLocations();
  const navigate = useNavigate();
  const [showQuickModal, setShowQuickModal] = useState(false);

  const stockQueries = useQueries({
    queries:
      products?.map((product) => ({
        queryKey: ["stock", product.id],
        queryFn: () => api.getStockForProduct(product.id),
        enabled: products.length > 0,
      })) ?? [],
  });

  const inventoryQueries = useQueries({
    queries:
      products?.map((product) => ({
        queryKey: ["inventories", product.id],
        queryFn: () => api.getInventoriesByProduct(product.id),
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

  const inventoriesByProduct = useMemo(() => {
    const map = new Map<number, Inventory[]>();
    products.forEach((product, index) => {
      const data = inventoryQueries[index]?.data;
      if (data) {
        map.set(product.id, data as Inventory[]);
      }
    });
    return map;
  }, [inventoryQueries, products]);

  return (
    <div className="space-y-6">
      <div className="glass-panel flex flex-wrap items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-brand-100">
            <img src={logo} alt="PetFlow" className="h-full w-full object-contain" />
          </div>
          <div>
            <p className="text-sm uppercase tracking-wide text-ink-500">Tableau principal</p>
            <p className="text-lg font-semibold text-ink-900">Pilotage des flux en un coup de patte</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setShowQuickModal(true)}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-card"
            disabled={products.length === 0 || locations.length === 0}
          >
            Nouveau mouvement / inventaire
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <StatCard
          title="Produits"
          value={loadingProducts ? "…" : products.length}
          hint="Catalogués"
          onClick={() => navigate("/products")}
        />
        <StatCard
          title="Emplacements"
          value={locations.length}
          hint="Actifs"
          tone="info"
          onClick={() => navigate("/locations")}
        />
        <StatCard
          title="Mouvements récents"
          value={recentMovements.length}
          hint="24h glissantes"
          tone="info"
          onClick={() => navigate("/movements")}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="glass-panel lg:col-span-2 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink-900">Stocks les plus bas</h2>
          </div>
          <div className="mt-3 space-y-3">
            {lowestStock.length === 0 ? (
              <p className="text-sm text-ink-600">Aucun article suivi pour l'instant.</p>
            ) : (
              lowestStock.map(({ product, quantity }) => (
                <button
                  key={product.id}
                  onClick={() => navigate(`/products/${product.id}`)}
                  className="flex w-full items-center justify-between rounded-xl border border-ink-100 bg-white px-3 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-card"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-ink-900">{product.name}</p>
                    <p className="text-xs text-ink-500">{product.sku}</p>
                    {inventoriesByProduct.get(product.id)?.length ? null : (
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800">
                        Inventaire manquant — stock estimé
                      </span>
                    )}
                  </div>
                  <StockBadge quantity={quantity} />
                </button>
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

      <MovementInventoryModal
        open={showQuickModal}
        onOpenChange={setShowQuickModal}
        products={products}
        locations={locations}
        subtitle="Saisie rapide depuis le tableau de bord"
        onCreated={() => navigate("/movements")}
      />
    </div>
  );
}

export default Dashboard;
