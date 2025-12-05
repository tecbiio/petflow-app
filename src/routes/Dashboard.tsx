import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueries, useMutation, useQueryClient } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import StatCard from "../components/StatCard";
import StockBadge from "../components/StockBadge";
import { useProducts } from "../hooks/useProducts";
import { useStockLocations } from "../hooks/useStockLocations";
import { api } from "../api/client";
import { StockMovement, Inventory } from "../types";
import logo from "../assets/petflow-logo.svg";

function useAnchorRect() {
  const ref = useRef<HTMLInputElement | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const update = () => {
    if (ref.current) {
      setRect(ref.current.getBoundingClientRect());
    }
  };

  useEffect(() => {
    const handler = () => update();
    window.addEventListener("resize", handler);
    window.addEventListener("scroll", handler, true);
    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("scroll", handler, true);
    };
  }, []);

  return { ref, rect, update };
}

function Dashboard() {
  const { data: products = [], isLoading: loadingProducts } = useProducts();
  const { data: locations = [] } = useStockLocations();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showQuickModal, setShowQuickModal] = useState(false);
  const [quickMode, setQuickMode] = useState<"movement" | "inventory">("movement");
  const [selectedProductId, setSelectedProductId] = useState<number | undefined>();
  const [selectedLocationId, setSelectedLocationId] = useState<number | undefined>();
  const [quickProductSearch, setQuickProductSearch] = useState("");
  const [quickLocationSearch, setQuickLocationSearch] = useState("");
  const [quickProductFocused, setQuickProductFocused] = useState(false);
  const [quickLocationFocused, setQuickLocationFocused] = useState(false);
  const [quantity, setQuantity] = useState(0);
  const [movementType, setMovementType] = useState<"IN" | "OUT" | "ADJUST">("ADJUST");
  const [reason, setReason] = useState("");
  const [quickMessage, setQuickMessage] = useState<string | null>(null);
  const quickProductAnchor = useAnchorRect();
  const quickLocationAnchor = useAnchorRect();

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

  const quickProductOptions = useMemo(
    () =>
      products
        .filter(
          (p) =>
            p.name.toLowerCase().includes(quickProductSearch.toLowerCase()) ||
            p.sku.toLowerCase().includes(quickProductSearch.toLowerCase()),
        )
        .slice(0, 10),
    [products, quickProductSearch],
  );

  const quickLocationOptions = useMemo(
    () =>
      locations
        .filter(
          (l) =>
            l.name.toLowerCase().includes(quickLocationSearch.toLowerCase()) ||
            l.code.toLowerCase().includes(quickLocationSearch.toLowerCase()),
        )
        .slice(0, 10),
    [locations, quickLocationSearch],
  );

  useEffect(() => {
    if (!selectedLocationId) {
      const def = locations.find((l) => l.isDefault)?.id ?? locations[0]?.id;
      if (def) setSelectedLocationId(def);
    }
  }, [locations, selectedLocationId]);

  useEffect(() => {
    if (showQuickModal) {
      setQuickProductSearch(selectedProductId ? products.find((p) => p.id === selectedProductId)?.name ?? "" : "");
      const loc = locations.find((l) => l.id === selectedLocationId);
      setQuickLocationSearch(loc?.name ?? "");
    }
  }, [showQuickModal, products, locations, selectedProductId, selectedLocationId]);

  useEffect(() => {
    if (quickProductFocused) {
      quickProductAnchor.update();
    }
  }, [quickProductFocused, quickProductAnchor]);

  useEffect(() => {
    if (quickLocationFocused) {
      quickLocationAnchor.update();
    }
  }, [quickLocationFocused, quickLocationAnchor]);

  const createMovement = useMutation({
    mutationFn: api.createStockMovement,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      queryClient.invalidateQueries({ queryKey: ["stock", variables.productId] });
      queryClient.invalidateQueries({ queryKey: ["inventories"] });
      setShowQuickModal(false);
      navigate("/movements");
    },
    onError: (error: Error) => setQuickMessage(error.message),
  });

  const createInventory = useMutation({
    mutationFn: api.createInventory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventories"] });
      setShowQuickModal(false);
      navigate("/movements");
    },
    onError: (error: Error) => setQuickMessage(error.message),
  });

  const handleQuickSubmit = (event: FormEvent) => {
    event.preventDefault();
    setQuickMessage(null);
    if (!selectedProductId || !selectedLocationId) {
      setQuickMessage("Choisissez produit et emplacement.");
      return;
    }
    if (!Number.isFinite(quantity)) {
      setQuickMessage("Quantité requise.");
      return;
    }
    if (quickMode === "movement") {
      if (quantity === 0) {
        setQuickMessage("Quantité non nulle requise.");
        return;
      }
      const signed =
        movementType === "IN" ? Math.abs(quantity) : movementType === "OUT" ? -Math.abs(quantity) : quantity;
      createMovement.mutate({
        productId: selectedProductId,
        stockLocationId: selectedLocationId,
        quantityDelta: signed,
        reason: reason || movementType,
        createdAt: new Date().toISOString(),
      });
    } else {
      createInventory.mutate({
        productId: selectedProductId,
        stockLocationId: selectedLocationId,
        quantity,
        createdAt: new Date().toISOString(),
      });
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

      {showQuickModal
        ? createPortal(
            <div
              className="fixed inset-0 z-[3000] flex items-center justify-center bg-ink-900/40 px-4 backdrop-blur-sm"
              onClick={() => setShowQuickModal(false)}
            >
              <div
                className="w-full max-w-3xl rounded-2xl bg-white p-5 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold text-ink-900">
                      {quickMode === "movement" ? "Créer un mouvement" : "Inventaire partiel"}
                    </p>
                    <p className="text-xs text-ink-500">Saisie rapide depuis le tableau de bord</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowQuickModal(false)}
                    className="rounded-full bg-ink-100 px-3 py-1 text-xs font-semibold text-ink-700"
                  >
                    Fermer
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickMode("movement")}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                      quickMode === "movement"
                        ? "bg-ink-900 text-white shadow-card"
                        : "bg-ink-100 text-ink-700 hover:bg-ink-200"
                    }`}
                  >
                    Mouvement
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickMode("inventory")}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                      quickMode === "inventory"
                        ? "bg-ink-900 text-white shadow-card"
                        : "bg-ink-100 text-ink-700 hover:bg-ink-200"
                    }`}
                  >
                    Inventaire partiel
                  </button>
                </div>

                <form className="mt-4 space-y-3" onSubmit={handleQuickSubmit}>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="text-sm text-ink-700">
                      Produit
                      <div className="relative mt-1">
                        <input
                          value={quickProductSearch}
                          onChange={(e) => {
                            setQuickProductSearch(e.target.value);
                          }}
                          onFocus={() => setQuickProductFocused(true)}
                          onBlur={() => setTimeout(() => setQuickProductFocused(false), 100)}
                          ref={quickProductAnchor.ref}
                          className="w-full rounded-lg border border-ink-100 bg-white px-3 py-2"
                          placeholder="Rechercher un produit"
                        />
                      </div>
                    </label>
                    <label className="text-sm text-ink-700">
                      Emplacement
                      <div className="relative mt-1">
                        <input
                          value={quickLocationSearch}
                          onChange={(e) => setQuickLocationSearch(e.target.value)}
                          onFocus={() => setQuickLocationFocused(true)}
                          onBlur={() => setTimeout(() => setQuickLocationFocused(false), 100)}
                          ref={quickLocationAnchor.ref}
                          className="w-full rounded-lg border border-ink-100 bg-white px-3 py-2"
                          placeholder="Rechercher un emplacement"
                        />
                      </div>
                    </label>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="text-sm text-ink-700">
                      Quantité {quickMode === "movement" ? " (peut être négative)" : ""}
                      <input
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                        className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2"
                      />
                    </label>

                    {quickMode === "movement" ? (
                      <label className="text-sm text-ink-700">
                        Nature du mouvement
                        <select
                          value={movementType}
                          onChange={(e) => setMovementType(e.target.value as typeof movementType)}
                          className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2"
                        >
                          <option value="IN">Entrée</option>
                          <option value="OUT">Sortie</option>
                          <option value="ADJUST">Ajustement</option>
                        </select>
                      </label>
                    ) : (
                      <div />
                    )}
                  </div>

                  {quickMode === "movement" ? (
                    <label className="block text-sm text-ink-700">
                      Motif / référence
                      <input
                        type="text"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2"
                        placeholder="Commande client, casse, etc."
                      />
                    </label>
                  ) : null}

                  <div className="flex items-center justify-between">
                    {quickMessage ? <p className="text-xs text-amber-700">{quickMessage}</p> : <span />}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowQuickModal(false)}
                        className="rounded-lg bg-ink-100 px-4 py-2 text-sm font-semibold text-ink-700"
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-card"
                        disabled={createMovement.isPending || createInventory.isPending}
                      >
                        {createMovement.isPending || createInventory.isPending ? "Envoi…" : "Créer"}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>,
            document.body,
          )
        : null}
      {quickProductFocused && quickProductSearch.trim() && quickProductAnchor.rect
        ? createPortal(
            <div
              className="z-[4000] max-h-48 overflow-auto rounded-lg border border-ink-100 bg-white shadow-lg"
              style={{
                position: "fixed",
                top: (quickProductAnchor.rect?.bottom ?? 0) + 4,
                left: quickProductAnchor.rect?.left ?? 0,
                width: quickProductAnchor.rect?.width ?? "auto",
              }}
            >
              {quickProductOptions.length === 0 ? (
                <p className="px-3 py-2 text-xs text-ink-500">Aucun résultat</p>
              ) : (
                quickProductOptions.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setSelectedProductId(p.id);
                      setQuickProductSearch(p.name);
                      setQuickProductFocused(false);
                    }}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-ink-50 ${
                      selectedProductId === p.id ? "bg-ink-50" : ""
                    }`}
                  >
                    <span className="font-semibold text-ink-900">{p.name}</span>
                    <span className="text-xs text-ink-500">{p.sku}</span>
                  </button>
                ))
              )}
            </div>,
            document.body,
          )
        : null}
      {quickLocationFocused && quickLocationSearch.trim() && quickLocationAnchor.rect
        ? createPortal(
            <div
              className="z-[4000] max-h-48 overflow-auto rounded-lg border border-ink-100 bg-white shadow-lg"
              style={{
                position: "fixed",
                top: (quickLocationAnchor.rect?.bottom ?? 0) + 4,
                left: quickLocationAnchor.rect?.left ?? 0,
                width: quickLocationAnchor.rect?.width ?? "auto",
              }}
            >
              {quickLocationOptions.length === 0 ? (
                <p className="px-3 py-2 text-xs text-ink-500">Aucun résultat</p>
              ) : (
                quickLocationOptions.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setSelectedLocationId(l.id);
                      setQuickLocationSearch(l.name);
                      setQuickLocationFocused(false);
                    }}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-ink-50 ${
                      selectedLocationId === l.id ? "bg-ink-50" : ""
                    }`}
                  >
                    <span className="font-semibold text-ink-900">{l.name}</span>
                    <span className="text-xs text-ink-500">{l.code}</span>
                  </button>
                ))
              )}
            </div>,
            document.body,
          )
        : null}
      {quickProductFocused && quickProductSearch.trim() && quickProductAnchor.rect
        ? createPortal(
            <div
              className="z-[4000] max-h-48 overflow-auto rounded-lg border border-ink-100 bg-white shadow-lg"
              style={{
                position: "fixed",
                top: (quickProductAnchor.rect?.bottom ?? 0) + 4,
                left: quickProductAnchor.rect?.left ?? 0,
                width: quickProductAnchor.rect?.width ?? "auto",
              }}
            >
              {quickProductOptions.length === 0 ? (
                <p className="px-3 py-2 text-xs text-ink-500">Aucun résultat</p>
              ) : (
                quickProductOptions.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setSelectedProductId(p.id);
                      setQuickProductSearch(p.name);
                      setQuickProductFocused(false);
                    }}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-ink-50 ${
                      selectedProductId === p.id ? "bg-ink-50" : ""
                    }`}
                  >
                    <span className="font-semibold text-ink-900">{p.name}</span>
                    <span className="text-xs text-ink-500">{p.sku}</span>
                  </button>
                ))
              )}
            </div>,
            document.body,
          )
        : null}
      {quickLocationFocused && quickLocationSearch.trim() && quickLocationAnchor.rect
        ? createPortal(
            <div
              className="z-[4000] max-h-48 overflow-auto rounded-lg border border-ink-100 bg-white shadow-lg"
              style={{
                position: "fixed",
                top: (quickLocationAnchor.rect?.bottom ?? 0) + 4,
                left: quickLocationAnchor.rect?.left ?? 0,
                width: quickLocationAnchor.rect?.width ?? "auto",
              }}
            >
              {quickLocationOptions.length === 0 ? (
                <p className="px-3 py-2 text-xs text-ink-500">Aucun résultat</p>
              ) : (
                quickLocationOptions.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setSelectedLocationId(l.id);
                      setQuickLocationSearch(l.name);
                      setQuickLocationFocused(false);
                    }}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-ink-50 ${
                      selectedLocationId === l.id ? "bg-ink-50" : ""
                    }`}
                  >
                    <span className="font-semibold text-ink-900">{l.name}</span>
                    <span className="text-xs text-ink-500">{l.code}</span>
                  </button>
                ))
              )}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

export default Dashboard;
