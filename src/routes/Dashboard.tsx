import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import MovementInventoryModal from "../components/MovementInventoryModal";
import StatCard from "../components/StatCard";
import StockBadge from "../components/StockBadge";
import InventoryStatusBadge from "../components/InventoryStatusBadge";
import StockValuationChart from "../components/StockValuationChart";
import SearchSelect from "../components/SearchSelect";
import PageHeader from "../components/ui/PageHeader";
import { useProducts } from "../hooks/useProducts";
import { useStockLocations } from "../hooks/useStockLocations";
import { useStockValuations } from "../hooks/useStockValuations";
import { Inventory } from "../types";
import { api } from "../api/client";
import logo from "../assets/petflow-logo.svg";

function Dashboard() {
  const { data: products = [], isLoading: loadingProducts } = useProducts();
  const { data: locations = [] } = useStockLocations();
  const navigate = useNavigate();
  const [showQuickModal, setShowQuickModal] = useState(false);
  const [valuationLocationId, setValuationLocationId] = useState<number | "all">("all");
  const [valuationLocationSearch, setValuationLocationSearch] = useState("Tous les emplacements");
  const { data: valuationPoints = [], isLoading: loadingValuations } = useStockValuations({
    days: 30,
    stockLocationId: valuationLocationId,
  });

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

  const thresholdMatches = useMemo(() => {
    const matches = products
      .map((product, index) => {
        const quantity = stockQueries[index]?.data?.stock;
        if (quantity === undefined) return null;
        const threshold = product.stockThreshold ?? 0;
        if (quantity > threshold) return null;
        return { product, quantity, threshold, deficit: threshold - quantity };
      })
      .filter(Boolean) as Array<{
      product: (typeof products)[number];
      quantity: number;
      threshold: number;
      deficit: number;
    }>;

    return matches.sort((a, b) => b.deficit - a.deficit);
  }, [products, stockQueries]);

  const stocksLoading = stockQueries.some((q) => q.isLoading);
  const underThresholdCount = thresholdMatches.length;
  const productsUnderThreshold = thresholdMatches.slice(0, 5);

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

  const valuationLocationOptions = useMemo(
    () => [
      { id: "all" as const, label: "Tous les emplacements", hint: "Global" },
      ...locations.map((loc) => ({ id: loc.id, label: loc.name, hint: loc.code })),
    ],
    [locations],
  );

  const filteredValuationLocationOptions = useMemo(
    () =>
      valuationLocationOptions.filter(
        (opt) =>
          opt.label.toLowerCase().includes(valuationLocationSearch.toLowerCase()) ||
          (opt.hint?.toLowerCase().includes(valuationLocationSearch.toLowerCase()) ?? false),
      ),
    [valuationLocationOptions, valuationLocationSearch],
  );

  const valuationLocationLabel =
    valuationLocationId === "all"
      ? "Tous les emplacements"
      : locations.find((l) => l.id === valuationLocationId)?.name ?? `Emplacement #${valuationLocationId}`;

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Tableau principal"
        title="Pilotage des flux en un coup de patte"
        icon={<img src={logo} alt="PetFlow" className="h-full w-full object-contain" />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/documents")}
              className="btn btn-outline"
            >
              Documents
            </button>
            <button
              type="button"
              onClick={() => navigate("/movements")}
              className="btn btn-outline"
            >
              Mouvements
            </button>
            <button
              type="button"
              onClick={() => setShowQuickModal(true)}
              className="btn btn-primary"
              disabled={products.length === 0 || locations.length === 0}
            >
              Nouveau mouvement / inventaire
            </button>
          </div>
        }
      />

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
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
          onClick={() => navigate("/locations")}
        />
        <StatCard
          title="Sous le seuil"
          value={stocksLoading ? "…" : underThresholdCount}
          hint="Alertes stock"
          tone={!stocksLoading && underThresholdCount > 0 ? "warning" : "default"}
          onClick={() => navigate("/products")}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="panel lg:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ink-900">Valorisation du stock</h2>
              <p className="text-sm text-ink-500">30 derniers jours, calcul journalier en cache</p>
            </div>
            <div className="w-64">
              <SearchSelect
                label="Emplacement"
                placeholder="Rechercher un emplacement"
                valueId={valuationLocationId}
                search={valuationLocationSearch}
                onSearch={setValuationLocationSearch}
                options={filteredValuationLocationOptions}
                onSelect={(opt) => {
                  if (!opt) {
                    setValuationLocationId("all");
                    setValuationLocationSearch("Tous les emplacements");
                    return;
                  }
                  setValuationLocationId(opt.id === "all" ? "all" : Number(opt.id));
                  setValuationLocationSearch(opt.label);
                }}
              />
            </div>
          </div>
          <div className="mt-3">
            <StockValuationChart
              points={valuationPoints}
              loading={loadingValuations}
              locationLabel={valuationLocationLabel}
            />
          </div>
        </div>

        <div className="panel lg:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-ink-900">Produits sous le seuil</h2>
              <p className="text-sm text-ink-500">Basé sur le seuil défini par produit</p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/products")}
              className="btn btn-sm btn-outline"
            >
              Voir tout
            </button>
          </div>
          <div className="mt-3 space-y-3">
            {productsUnderThreshold.length === 0 ? (
              <p className="text-sm text-ink-600">
                {stocksLoading
                  ? "Chargement des stocks…"
                  : "Aucun produit sous le seuil. Définis un seuil dans la fiche produit si besoin."}
              </p>
            ) : (
              productsUnderThreshold.map(({ product, quantity, threshold, deficit }) => (
                <button
                  key={product.id}
                  onClick={() => navigate(`/products/${product.id}`)}
                  className="card flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition hover:-translate-y-0.5 hover:shadow-card"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-sm font-semibold text-ink-900">{product.name}</p>
                    <p className="text-xs text-ink-500">
                      {product.sku} · Seuil {threshold}
                      {deficit > 0 ? ` · Manque ${deficit}` : ""}
                    </p>
                    {inventoriesByProduct.get(product.id)?.length ? null : <InventoryStatusBadge />}
                  </div>
                  <StockBadge quantity={quantity} />
                </button>
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
