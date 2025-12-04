import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { useProducts } from "../hooks/useProducts";
import { useStockLocations } from "../hooks/useStockLocations";
import { Inventory, StockMovement } from "../types";

type TypeFilter = "all" | "movement" | "inventory";
type Option = { id: number; label: string; hint?: string };

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

function Movements() {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [productFilter, setProductFilter] = useState<number | "all">("all");
  const [productSearch, setProductSearch] = useState("");
  const [productFilterFocused, setProductFilterFocused] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [entryMode, setEntryMode] = useState<"movement" | "inventory">("movement");
  const [movementProductId, setMovementProductId] = useState<number | undefined>();
  const [movementLocationId, setMovementLocationId] = useState<number | undefined>();
  const [entryQuantity, setEntryQuantity] = useState(0);
  const [movementType, setMovementType] = useState<"IN" | "OUT" | "ADJUST">("ADJUST");
  const [movementReason, setMovementReason] = useState("");
  const [movementProductSearch, setMovementProductSearch] = useState("");
  const [movementLocationSearch, setMovementLocationSearch] = useState("");
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const filterAnchor = useAnchorRect();

  const { data: products = [] } = useProducts();
  const { data: locations = [] } = useStockLocations();
  const queryClient = useQueryClient();

  const productId = productFilter === "all" ? undefined : productFilter;

  const {
    data: movements = [],
    isLoading: loadingMovements,
  } = useQuery({
    queryKey: ["stock-movements", productId],
    queryFn: () => api.listStockMovements(productId ? { productId } : undefined),
    enabled: typeFilter !== "inventory",
  });

  const {
    data: inventories = [],
    isLoading: loadingInventories,
  } = useQuery({
    queryKey: ["inventories", productId],
    queryFn: () => api.listInventories(productId ? { productId } : undefined),
    enabled: typeFilter !== "movement",
  });

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const locationMap = useMemo(() => new Map(locations.map((l) => [l.id, l])), [locations]);

  const productOptions = useMemo(
    () =>
      products
        .filter(
          (p) =>
            p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
            p.sku.toLowerCase().includes(productSearch.toLowerCase()),
        )
        .slice(0, 10),
    [productSearch, products],
  );

  const movementProductOptions: Option[] = useMemo(
    () =>
      products
        .filter(
          (p) =>
            p.name.toLowerCase().includes(movementProductSearch.toLowerCase()) ||
            p.sku.toLowerCase().includes(movementProductSearch.toLowerCase()),
        )
        .slice(0, 10)
        .map((p) => ({ id: p.id, label: p.name, hint: p.sku })),
    [products, movementProductSearch],
  );

  const movementLocationOptions: Option[] = useMemo(
    () =>
      locations
        .filter(
          (l) =>
            l.name.toLowerCase().includes(movementLocationSearch.toLowerCase()) ||
            l.code.toLowerCase().includes(movementLocationSearch.toLowerCase()),
        )
        .slice(0, 10)
        .map((l) => ({ id: l.id, label: l.name, hint: l.code })),
    [locations, movementLocationSearch],
  );


  useEffect(() => {
    if (!movementLocationId) {
      const def = locations.find((l) => l.isDefault)?.id ?? locations[0]?.id;
      if (def) setMovementLocationId(def);
    }
  }, [movementLocationId, locations]);

  useEffect(() => {
    if (showCreateModal) {
      if (movementProductId) {
        const prod = products.find((p) => p.id === movementProductId);
        setMovementProductSearch(prod?.name ?? "");
      } else {
        setMovementProductSearch("");
      }
      const loc = locations.find((l) => l.id === movementLocationId);
      setMovementLocationSearch(loc?.name ?? "");
    }
  }, [showCreateModal, products, locations, movementProductId, movementLocationId]);

  useEffect(() => {
    if (productFilterFocused) {
      filterAnchor.update();
    }
  }, [productFilterFocused, filterAnchor]);

  const createMovement = useMutation({
    mutationFn: api.createStockMovement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      queryClient.invalidateQueries({ queryKey: ["stock", movementProductId] });
      setShowCreateModal(false);
      setEntryQuantity(0);
      setMovementReason("");
      setFormMessage(null);
    },
    onError: (error: Error) => setFormMessage(error.message),
  });

  const createInventory = useMutation({
    mutationFn: api.createInventory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventories"] });
      setShowCreateModal(false);
      setEntryQuantity(0);
      setFormMessage(null);
    },
    onError: (error: Error) => setFormMessage(error.message),
  });

  const handleCreateMovement = (event: FormEvent) => {
    event.preventDefault();
    setFormMessage(null);
    if (!movementProductId || !movementLocationId) {
      setFormMessage("Sélectionne un produit et un emplacement.");
      return;
    }
    if (!Number.isFinite(entryQuantity) || (entryMode === "movement" && entryQuantity === 0)) {
      setFormMessage("Quantité non nulle requise.");
      return;
    }
    if (entryMode === "movement") {
      const signed =
        movementType === "IN"
          ? Math.abs(entryQuantity)
          : movementType === "OUT"
            ? -Math.abs(entryQuantity)
            : entryQuantity;
      createMovement.mutate({
        productId: movementProductId,
        stockLocationId: movementLocationId,
        quantityDelta: signed,
        reason: movementReason || movementType,
        createdAt: new Date().toISOString(),
      });
    } else {
      createInventory.mutate({
        productId: movementProductId,
        stockLocationId: movementLocationId,
        quantity: entryQuantity,
        createdAt: new Date().toISOString(),
      });
    }
  };


  const combined = useMemo(() => {
    const rows: Array<
      | { kind: "movement"; createdAt: string; data: StockMovement }
      | { kind: "inventory"; createdAt: string; data: Inventory }
    > = [];
    if (typeFilter !== "inventory") {
      rows.push(...movements.map((m) => ({ kind: "movement" as const, createdAt: m.createdAt, data: m })));
    }
    if (typeFilter !== "movement") {
      rows.push(...inventories.map((i) => ({ kind: "inventory" as const, createdAt: i.createdAt, data: i })));
    }
    return rows.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [typeFilter, movements, inventories]);

  const loading =
    (typeFilter !== "inventory" && loadingMovements) || (typeFilter !== "movement" && loadingInventories);

  const applyProductFilter = () => {
    if (!productSearch.trim()) {
      setProductFilter("all");
      return;
    }
    const match = productOptions[0];
    if (match) {
      setProductFilter(match.id);
      setProductSearch(match.name);
    }
  };

  return (
    <div className="space-y-4">
      <div className="glass-panel flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="text-lg font-semibold text-ink-900">Mouvements & inventaires</p>
          <p className="text-xs text-ink-500">Journal des variations de stock avec filtres.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEntryMode("movement");
            setShowCreateModal(true);
          }}
          className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-card disabled:cursor-not-allowed disabled:opacity-60"
          disabled={products.length === 0 || locations.length === 0}
        >
          Nouveau mouvement / inventaire
        </button>
      </div>

      <div className="glass-panel flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-ink-100 bg-white p-1 shadow-sm">
            {([
              { value: "all", label: "Tous" },
              { value: "movement", label: "Mouvements" },
              { value: "inventory", label: "Inventaires" },
            ] as const).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setTypeFilter(option.value)}
                className={`rounded-md px-3 py-1 text-sm font-semibold transition ${
                  typeFilter === option.value
                    ? "bg-ink-900 text-white shadow-card"
                    : "text-ink-700 hover:bg-ink-50"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setProductFilter("all")}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                productFilter === "all"
                  ? "bg-ink-900 text-white shadow-card"
                  : "border border-ink-100 bg-white text-ink-700 hover:bg-ink-50"
              }`}
            >
              Tous les produits
            </button>
            <div className="relative">
              <input
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                onFocus={() => setProductFilterFocused(true)}
                onBlur={() => {
                  setProductFilterFocused(false);
                  applyProductFilter();
                }}
                ref={filterAnchor.ref}
                placeholder={productFilter === "all" ? "Filtrer par produit…" : productMap.get(productFilter)?.name}
                className="w-56 rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm shadow-sm"
              />
            </div>
          </div>
        </div>
        <span className="text-sm font-semibold text-ink-700">{combined.length} résultats</span>
      </div>

      {loading ? (
        <p className="text-sm text-ink-600">Chargement…</p>
      ) : combined.length === 0 ? (
        <p className="text-sm text-ink-600">Aucune entrée pour ces filtres.</p>
      ) : (
        <div className="space-y-3">
          {combined.map((row) => {
            const product = productMap.get(row.data.productId);
            const location = locationMap.get(row.data.stockLocationId);
            const key = `${row.kind}-${row.data.id}`;

            return (
              <div
                key={key}
                className="glass-panel rounded-xl border border-ink-100 bg-white px-4 py-3 shadow-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`pill ${
                        row.kind === "movement"
                          ? "bg-brand-50 text-brand-700"
                          : "bg-amber-50 text-amber-800"
                      }`}
                    >
                      {row.kind === "movement" ? "Mouvement" : "Inventaire"}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-ink-900">
                        {product?.name ?? `Produit #${row.data.productId}`}
                      </p>
                      <p className="text-xs text-ink-500">
                        {new Date(row.createdAt).toLocaleString("fr-FR")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {row.kind === "movement" ? (
                      <>
                        <p
                          className={`text-sm font-semibold ${
                            row.data.quantityDelta >= 0 ? "text-emerald-700" : "text-amber-700"
                          }`}
                        >
                          {row.data.quantityDelta >= 0 ? "+" : ""}
                          {row.data.quantityDelta}
                        </p>
                        <p className="text-xs text-ink-500">{row.data.reason}</p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-ink-900">
                          Stock constaté: {row.data.quantity}
                        </p>
                        <p className="text-xs text-ink-500">Inventaire</p>
                      </>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-ink-600">
                  <span>SKU: {product?.sku ?? "N/A"}</span>
                  <span>Emplacement: {location?.name ?? `#${row.data.stockLocationId}`}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {productFilterFocused && productSearch.trim() && filterAnchor.rect
        ? createPortal(
            <div
              className="z-[4000] max-h-56 overflow-auto rounded-lg border border-ink-100 bg-white shadow-lg"
              style={{
                position: "fixed",
                top: (filterAnchor.rect?.bottom ?? 0) + 4,
                left: filterAnchor.rect?.left ?? 0,
                width: filterAnchor.rect?.width ?? "auto",
              }}
            >
              {productOptions.length === 0 ? (
                <p className="px-3 py-2 text-xs text-ink-500">Aucun résultat</p>
              ) : (
                productOptions.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setProductFilter(p.id);
                      setProductSearch(p.name);
                      setProductFilterFocused(false);
                    }}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-ink-50 ${
                      productFilter === p.id ? "bg-ink-50" : ""
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

      {showCreateModal
        ? createPortal(
            <div
              className="fixed inset-0 z-[3000] flex items-center justify-center bg-ink-900/40 px-4 backdrop-blur-sm"
              onClick={() => setShowCreateModal(false)}
            >
              <div
                className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold text-ink-900">
                      {entryMode === "movement" ? "Créer un mouvement" : "Inventaire partiel"}
                    </p>
                    <p className="text-xs text-ink-500">Mise à jour rapide depuis la liste.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="rounded-full bg-ink-100 px-3 py-1 text-xs font-semibold text-ink-700"
                  >
                    Fermer
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setEntryMode("movement")}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                      entryMode === "movement"
                        ? "bg-ink-900 text-white shadow-card"
                        : "bg-ink-100 text-ink-700 hover:bg-ink-200"
                    }`}
                  >
                    Mouvement
                  </button>
                  <button
                    type="button"
                    onClick={() => setEntryMode("inventory")}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                      entryMode === "inventory"
                        ? "bg-ink-900 text-white shadow-card"
                        : "bg-ink-100 text-ink-700 hover:bg-ink-200"
                    }`}
                  >
                    Inventaire partiel
                  </button>
                </div>

                <form className="mt-4 space-y-3" onSubmit={handleCreateMovement}>
                  <div className="grid gap-3 md:grid-cols-2">
                    <SearchSelect
                      label="Produit"
                      placeholder="Rechercher un produit"
                      valueId={movementProductId}
                      search={movementProductSearch}
                      onSearch={setMovementProductSearch}
                      options={movementProductOptions}
                      onSelect={(opt) => {
                        setMovementProductId(opt.id);
                        setMovementProductSearch(opt.label);
                      }}
                    />
                    <SearchSelect
                      label="Emplacement"
                      placeholder="Rechercher un emplacement"
                      valueId={movementLocationId}
                      search={movementLocationSearch}
                      onSearch={setMovementLocationSearch}
                      options={movementLocationOptions}
                      onSelect={(opt) => {
                        setMovementLocationId(opt.id);
                        setMovementLocationSearch(opt.label);
                      }}
                    />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="text-sm text-ink-700">
                      Quantité {entryMode === "movement" ? "(peut être négative)" : ""}
                      <input
                        type="number"
                        value={entryQuantity}
                        onChange={(e) => setEntryQuantity(Number(e.target.value))}
                        className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2"
                      />
                    </label>
                    {entryMode === "movement" ? (
                      <label className="text-sm text-ink-700">
                        Nature
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
                  {entryMode === "movement" ? (
                    <label className="block text-sm text-ink-700">
                      Motif / référence
                      <input
                        type="text"
                        value={movementReason}
                        onChange={(e) => setMovementReason(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2"
                        placeholder="Commande client, casse, etc."
                      />
                    </label>
                  ) : null}
                  <div className="flex items-center justify-between">
                    {formMessage ? <p className="text-xs text-amber-700">{formMessage}</p> : <span />}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowCreateModal(false)}
                        className="rounded-lg bg-ink-100 px-4 py-2 text-sm font-semibold text-ink-700"
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-card"
                        disabled={createMovement.isPending || products.length === 0 || locations.length === 0}
                      >
                        {createMovement.isPending ? "Envoi…" : "Créer"}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>,
            document.body,
          )
        : null}
      {productFilterFocused && productSearch.trim() && filterAnchor.rect
        ? createPortal(
            <div
              className="z-[4000] max-h-56 overflow-auto rounded-lg border border-ink-100 bg-white shadow-lg"
              style={{
                position: "fixed",
                top: (filterAnchor.rect?.bottom ?? 0) + 4,
                left: filterAnchor.rect?.left ?? 0,
                width: filterAnchor.rect?.width ?? "auto",
              }}
            >
              {productOptions.length === 0 ? (
                <p className="px-3 py-2 text-xs text-ink-500">Aucun résultat</p>
              ) : (
                productOptions.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setProductFilter(p.id);
                      setProductSearch(p.name);
                      setProductFilterFocused(false);
                    }}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-ink-50 ${
                      productFilter === p.id ? "bg-ink-50" : ""
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
    </div>
  );
}

export default Movements;

function SearchSelect({
  label,
  placeholder,
  valueId,
  search,
  onSearch,
  options,
  onSelect,
}: {
  label: string;
  placeholder: string;
  valueId?: number;
  search: string;
  onSearch: (v: string) => void;
  options: Option[];
  onSelect: (opt: Option) => void;
}) {
  const [focused, setFocused] = useState(false);
  const anchor = useAnchorRect();

  useEffect(() => {
    if (focused) anchor.update();
  }, [focused, anchor]);

  return (
    <label className="text-sm text-ink-700">
      {label}
      <div className="relative mt-1">
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 100)}
          ref={anchor.ref}
          className="w-full rounded-lg border border-ink-100 bg-white px-3 py-2"
          placeholder={placeholder}
        />
      </div>
      {focused && search.trim() && anchor.rect
        ? createPortal(
            <div
              className="z-[4000] max-h-48 overflow-auto rounded-lg border border-ink-100 bg-white shadow-lg"
              style={{
                position: "fixed",
                top: (anchor.rect?.bottom ?? 0) + 4,
                left: anchor.rect?.left ?? 0,
                width: anchor.rect?.width ?? "auto",
              }}
            >
              {options.length === 0 ? (
                <p className="px-3 py-2 text-xs text-ink-500">Aucun résultat</p>
              ) : (
                options.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onSelect(opt);
                      onSearch(opt.label);
                      setFocused(false);
                    }}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-ink-50 ${
                      valueId === opt.id ? "bg-ink-50" : ""
                    }`}
                  >
                    <span className="font-semibold text-ink-900">{opt.label}</span>
                    {opt.hint ? <span className="text-xs text-ink-500">{opt.hint}</span> : null}
                  </button>
                ))
              )}
            </div>,
            document.body,
          )
        : null}
    </label>
  );
}
