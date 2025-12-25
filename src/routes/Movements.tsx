import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "../lib/queryClient";
import { useProducts } from "../hooks/useProducts";
import { useStockLocations } from "../hooks/useStockLocations";
import { useAnchorRect } from "../hooks/useAnchorRect";
import { Inventory, StockMovement } from "../types";
import MovementInventoryModal from "../components/MovementInventoryModal";
import PageHeader from "../components/ui/PageHeader";
import EmptyState from "../components/ui/EmptyState";
import { STOCK_MOVEMENT_REASONS, StockMovementReason, formatReasonLabel, parseStockMovementReason } from "../lib/stockReasons";
import { api } from "../api/client";

type TypeFilter = "movement" | "inventory";

function Movements() {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("movement");
  const [productFilter, setProductFilter] = useState<number | "all">("all");
  const [productSearch, setProductSearch] = useState("");
  const [productFilterFocused, setProductFilterFocused] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [movementReasonsFilter, setMovementReasonsFilter] = useState<StockMovementReason[]>([]);
  const filterAnchor = useAnchorRect<HTMLInputElement>();

  const { data: products = [] } = useProducts();
  const { data: locations = [] } = useStockLocations();

  const productId = productFilter === "all" ? undefined : productFilter;
  const reasonsFilter = movementReasonsFilter.length > 0 ? movementReasonsFilter : undefined;
  const reasonsKey = movementReasonsFilter.length > 0 ? [...movementReasonsFilter].sort().join(",") : "all";

  const {
    data: movements = [],
    isLoading: loadingMovements,
  } = useQuery({
    queryKey: ["stock-movements", productId, reasonsKey],
    queryFn: () =>
      api.listStockMovements({
        ...(productId ? { productId } : {}),
        ...(reasonsFilter ? { reasons: reasonsFilter } : {}),
      }),
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
  const reasonOptions = useMemo(
    () =>
      STOCK_MOVEMENT_REASONS.map((reason) => ({
        value: reason,
        label: formatReasonLabel(reason),
      })),
    [],
  );

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

  useEffect(() => {
    if (productFilterFocused) {
      filterAnchor.update();
    }
  }, [productFilterFocused, filterAnchor]);

  const combined = useMemo(() => {
    const rows: Array<
      | { kind: "movement"; createdAt: string; data: StockMovement }
      | { kind: "inventory"; createdAt: string; data: Inventory }
    > = [];
    if (typeFilter === "movement") {
      rows.push(...movements.map((m) => ({ kind: "movement" as const, createdAt: m.createdAt, data: m })));
    } else {
      rows.push(...inventories.map((i) => ({ kind: "inventory" as const, createdAt: i.createdAt, data: i })));
    }
    return rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [typeFilter, movements, inventories]);

  const loading =
    (typeFilter === "movement" && loadingMovements) || (typeFilter === "inventory" && loadingInventories);

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

  const hasActiveFilters = Boolean(
    typeFilter !== "movement" || productFilter !== "all" || productSearch.trim() || movementReasonsFilter.length > 0,
  );

  const resetFilters = () => {
    setTypeFilter("movement");
    setMovementReasonsFilter([]);
    setProductFilter("all");
    setProductSearch("");
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Mouvements & inventaires"
        subtitle="Journal des variations de stock avec filtres."
        actions={
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
            disabled={products.length === 0 || locations.length === 0}
          >
            Nouveau mouvement / inventaire
          </button>
        }
      />

      <div className="panel flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setMovementReasonsFilter([]);
                setTypeFilter("movement");
              }}
              className={[
                "btn btn-sm",
                movementReasonsFilter.length === 0 && typeFilter === "movement" ? "btn-secondary" : "btn-outline",
              ].join(" ")}
            >
              Tous les mouvements
            </button>
            {reasonOptions.map((option) => {
              const isActive = movementReasonsFilter.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setTypeFilter("movement");
                    setMovementReasonsFilter((prev) =>
                      isActive ? prev.filter((r) => r !== option.value) : [...prev, option.value],
                    );
                  }}
                  className={[
                    "btn btn-sm",
                    isActive && typeFilter === "movement" ? "btn-secondary" : "btn-outline",
                  ].join(" ")}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <div className="hidden h-6 w-px bg-ink-200 sm:block" />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setTypeFilter("inventory");
                setMovementReasonsFilter([]);
              }}
              className={["btn btn-sm", typeFilter === "inventory" ? "btn-secondary" : "btn-outline"].join(" ")}
            >
              Inventaires
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setProductFilter("all");
              setProductSearch("");
            }}
            className={["btn btn-sm", productFilter === "all" ? "btn-secondary" : "btn-outline"].join(" ")}
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
              className="input w-56"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-ink-600">Chargement…</p>
      ) : combined.length === 0 ? (
        <EmptyState
          title="Aucune entrée"
          description={
            hasActiveFilters ? "Aucun mouvement ou inventaire pour ces filtres." : "Crée ton premier mouvement ou inventaire."
          }
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              {hasActiveFilters ? (
                <button type="button" onClick={resetFilters} className="btn btn-muted">
                  Réinitialiser
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="btn btn-primary"
                disabled={products.length === 0 || locations.length === 0}
              >
                Nouveau mouvement / inventaire
              </button>
            </div>
          }
        />
      ) : (
        <div className="space-y-3">
          {combined.map((row) => {
            const product = productMap.get(row.data.productId);
            const location = locationMap.get(row.data.stockLocationId);
            const key = `${row.kind}-${row.data.id}`;

            return (
              <div key={key} className="card px-4 py-3">
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
                        {(() => {
                          const parsed = parseStockMovementReason(row.data.reason);
                          const label = parsed.code ? formatReasonLabel(parsed.code) : row.data.reason;
                          const reference = row.data.sourceDocumentId ?? parsed.details;
                          const display = reference ? `${label} · ${reference}` : label;

                          return (
                            <>
                              <p
                                className={`text-sm font-semibold ${
                                  row.data.quantityDelta >= 0 ? "text-emerald-700" : "text-amber-700"
                                }`}
                              >
                                {row.data.quantityDelta >= 0 ? "+" : ""}
                                {row.data.quantityDelta}
                              </p>
                              <p className="text-xs text-ink-500">{display}</p>
                            </>
                          );
                        })()}
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

      <MovementInventoryModal
        open={showCreateModal}
        onOpenChange={(next) => setShowCreateModal(next)}
        products={products}
        locations={locations}
        subtitle="Depuis la liste des mouvements"
        showTrigger={false}
      />
      {productFilterFocused && productSearch.trim() && filterAnchor.rect
        ? createPortal(
            <div
              className="z-[4000] anim-popover-in max-h-56 overflow-auto rounded-lg border border-ink-100 bg-white shadow-lg"
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
