import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import MovementInventoryModal from "../components/MovementInventoryModal";
import StatCard from "../components/StatCard";
import StockBadge from "../components/StockBadge";
import StockValuationChart from "../components/StockValuationChart";
import SearchSelect from "../components/SearchSelect";
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
  const [downloadingExport, setDownloadingExport] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
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

  const lowestStock = useMemo(() => {
    return products
      .map((p, index) => ({
        product: p,
        quantity: stockQueries[index]?.data?.stock ?? 0,
      }))
      .sort((a, b) => a.quantity - b.quantity)
      .slice(0, 5);
  }, [products, stockQueries]);

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

  const handleExport = async () => {
    setExportMessage(null);
    setDownloadingExport(true);
    try {
      const { blob, filename } = await api.downloadDisposalMovements();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename ?? "mouvements_perso_poubelle_don.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportMessage(err instanceof Error ? err.message : "Erreur export");
    } finally {
      setDownloadingExport(false);
    }
  };

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

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Produits"
          value={loadingProducts ? "…" : products.length}
          hint="Catalogués"
          onClick={() => navigate("/products")}
        />
      </div>

      <div className="glass-panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink-900">Valorisation du stock</h2>
            <p className="text-sm text-ink-500">30 derniers jours, calcul journalier en cache</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
            <button
              type="button"
              onClick={handleExport}
              className="mt-5 inline-flex items-center rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700 transition hover:-translate-y-0.5 hover:shadow-card disabled:cursor-not-allowed disabled:opacity-60"
              disabled={downloadingExport}
            >
              {downloadingExport ? "Export…" : "Exporter PERSO/POUBELLE/DON"}
            </button>
          </div>
        </div>
        <div className="mt-3">
          <StockValuationChart
            points={valuationPoints}
            loading={loadingValuations}
            locationLabel={valuationLocationLabel}
          />
          {exportMessage ? <p className="mt-2 text-sm text-rose-600">{exportMessage}</p> : null}
        </div>
      </div>

      <div className="glass-panel p-4">
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
