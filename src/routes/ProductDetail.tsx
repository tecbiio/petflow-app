import { Link, Navigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "../lib/queryClient";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useProduct } from "../hooks/useProducts";
import { useProductStock, useProductVariations } from "../hooks/useStock";
import { useMovementsByProduct } from "../hooks/useMovements";
import { useInventoriesByProduct } from "../hooks/useInventories";
import { useStockLocations } from "../hooks/useStockLocations";
import { useFamilies } from "../hooks/useFamilies";
import { usePackagings } from "../hooks/usePackagings";
import StockBadge from "../components/StockBadge";
import InventoryStatusBadge from "../components/InventoryStatusBadge";
import { api } from "../api/client";
import StockChart from "../components/StockChart";
import { validateProductPayload } from "../lib/constraints";
import SearchSelect, { SelectOption } from "../components/SearchSelect";
import MovementInventoryModal from "../components/MovementInventoryModal";
import { formatReasonLabel, parseStockMovementReason } from "../lib/stockReasons";

function ProductDetail() {
  const { productId = "" } = useParams();
  const productNumericId = Number(productId);
  type ProductUpdateInput = {
    name?: string;
    sku?: string;
    stockThreshold?: number;
    price?: number;
    priceVdiHt?: number;
    priceDistributorHt?: number;
    priceSaleHt?: number;
    purchasePrice?: number;
    tvaRate?: number;
    packagingId?: number | null;
    description?: string | null;
    isActive?: boolean;
    familyId?: number | null;
    subFamilyId?: number | null;
  };
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [packagingSearch, setPackagingSearch] = useState("");
  const [editFields, setEditFields] = useState({
    name: "",
    sku: "",
    stockThreshold: "0",
    price: "",
    priceVdiHt: "",
    priceDistributorHt: "",
    priceSaleHt: "",
    purchasePrice: "",
    tvaRate: "",
    packagingId: null as number | null,
    description: "",
    isActive: true,
    familyId: null as number | null,
    subFamilyId: null as number | null,
  });
  const { data: product, error: productError, isError } = useProduct(productNumericId);
  const { data: stock } = useProductStock(productNumericId);
  const { data: variations = [] } = useProductVariations(productNumericId);
  const { data: movements = [] } = useMovementsByProduct(productNumericId);
  const { data: inventories = [] } = useInventoriesByProduct(productNumericId);
  const { data: locations = [] } = useStockLocations();
  const { data: packagings = [] } = usePackagings();
  const axonautConfig = useQuery({
    queryKey: ["axonaut-config"],
    queryFn: () => api.axonautGetConfig(),
  });
  const [showMovementModal, setShowMovementModal] = useState(false);
  const hasInventory = inventories.length > 0;
  const computeTtcValue = (ht: number, rate: number) => {
    if (!Number.isFinite(ht) || !Number.isFinite(rate) || ht === 0) return 0;
    return ht * (1 + rate / 100);
  };
  const formatHtValue = (value: number) => (Number.isFinite(value) && value !== 0 ? `${value.toFixed(2)} € HT` : "—");

  const firstMovementDate = useMemo(() => {
    if (variations.length === 0) return null;
    const earliest = variations.reduce(
      (min, mv) => Math.min(min, new Date(mv.createdAt).getTime()),
      Number.POSITIVE_INFINITY,
    );
    if (!Number.isFinite(earliest)) return null;
    return new Date(earliest).toISOString();
  }, [variations]);

  const baselineDate = useMemo(() => {
    if (!firstMovementDate) return null;
    const t = new Date(firstMovementDate).getTime();
    return new Date(t - 1).toISOString(); // juste avant le premier mouvement
  }, [firstMovementDate]);

  const { data: stockAtBaseline } = useQuery({
    queryKey: ["stock", productNumericId, "at", baselineDate],
    queryFn: () => api.getStockAtDate(productNumericId, baselineDate as string),
    enabled: Boolean(product) && Boolean(baselineDate) && !hasInventory,
  });
  const { data: familiesData = [] } = useFamilies();

  const chartData = useMemo(() => {
    if (!product) return [];

    const sortedMovements = [...variations].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    const sortedInventories = [...inventories].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    // S'il existe au moins un inventaire, on l'utilise comme ancrage
    if (sortedInventories.length > 0) {
      const anchor = sortedInventories[0]; // inventaire le plus ancien
      const anchorTime = new Date(anchor.createdAt).getTime();

      const beforeMovements = sortedMovements.filter(
        (mv) => new Date(mv.createdAt).getTime() < anchorTime,
      );
      const afterEvents = [
        ...sortedMovements.filter((mv) => new Date(mv.createdAt).getTime() >= anchorTime).map((mv) => ({
          date: mv.createdAt,
          type: "movement" as const,
          delta: mv.quantityDelta,
        })),
        ...sortedInventories.slice(1).map((inv) => ({
          date: inv.createdAt,
          type: "inventory" as const,
          quantity: inv.quantity,
        })),
      ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Segment avant l'inventaire d'ancrage (on remonte en arrière)
      let backRunning = anchor.quantity;
      const backwardPoints: { date: string; quantity: number }[] = [];
      [...beforeMovements]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .forEach((mv) => {
          backRunning -= mv.quantityDelta; // on remonte en arrière, on inverse le delta
          backwardPoints.push({ date: mv.createdAt, quantity: backRunning });
        });

      // Segment après l'ancrage
      let running = anchor.quantity;
      const forwardPoints: { date: string; quantity: number }[] = [{ date: anchor.createdAt, quantity: running }];
      afterEvents.forEach((evt) => {
        if (evt.type === "inventory") {
          running = evt.quantity ?? 0;
        } else {
          running += evt.delta ?? 0;
        }
        forwardPoints.push({ date: evt.date, quantity: running });
      });

      return [...backwardPoints.reverse(), ...forwardPoints];
    }

    // Pas d'inventaire : on ancre juste avant le premier mouvement ou à la création produit
    const baseQuantity = stockAtBaseline?.stock ?? 0;
    const startDate = baselineDate ?? product.createdAt;
    let running = baseQuantity;
    const points: { date: string; quantity: number }[] = [{ date: startDate, quantity: running }];
    sortedMovements.forEach((mv) => {
      running += mv.quantityDelta;
      points.push({ date: mv.createdAt, quantity: running });
    });

    if (points.length === 0) {
      return [{ date: product.createdAt, quantity: 0 }];
    }
    return points;
  }, [baselineDate, firstMovementDate, inventories, product, stockAtBaseline?.stock, variations]);

  const familyOptions = useMemo(
    () => familiesData.map((f) => ({ id: f.id, name: f.name, subFamilies: f.subFamilies ?? [] })),
    [familiesData],
  );

  const subFamilyOptions = useMemo(
    () =>
      familiesData.flatMap((f) =>
        (f.subFamilies ?? []).map((s) => ({ id: s.id, familyId: s.familyId, name: s.name })),
      ),
    [familiesData],
  );

  const subFamilyNameMap = useMemo(() => {
    const map = new Map<number, string>();
    familiesData.forEach((f) => f.subFamilies?.forEach((s) => map.set(s.id, s.name)));
    if (product?.subFamily?.id && product.subFamily.name) {
      map.set(product.subFamily.id, product.subFamily.name);
    }
    return map;
  }, [familiesData, product?.subFamily?.id, product?.subFamily?.name]);

  const packagingOptions: SelectOption[] = useMemo(
    () => packagings.map((p) => ({ id: p.id, label: p.name })),
    [packagings],
  );

  useEffect(() => {
    if (product) {
      setEditFields({
        name: product.name ?? "",
        sku: product.sku ?? "",
        stockThreshold: product.stockThreshold !== undefined ? String(product.stockThreshold) : "0",
        price: product.priceSaleHt !== undefined ? String(product.priceSaleHt) : product.price !== undefined ? String(product.price) : "",
        priceVdiHt: product.priceVdiHt !== undefined ? String(product.priceVdiHt) : "",
        priceDistributorHt: product.priceDistributorHt !== undefined ? String(product.priceDistributorHt) : "",
        priceSaleHt: product.priceSaleHt !== undefined ? String(product.priceSaleHt) : "",
        purchasePrice: product.purchasePrice !== undefined ? String(product.purchasePrice) : "",
        tvaRate: product.tvaRate !== undefined ? String(product.tvaRate) : "",
        packagingId: product.packagingId ?? null,
        description: product.description ?? "",
        isActive: product.isActive ?? true,
        familyId: product.family?.id ?? null,
        subFamilyId: product.subFamily?.id ?? null,
      });
      setPackagingSearch(product.packaging?.name ?? "");
    }
  }, [product]);

  const saveProduct = useMutation({
    mutationFn: (payload: ProductUpdateInput) => api.updateProduct(productNumericId, payload),
    onSuccess: (updated) => {
      setMessage(`Produit mis à jour (id ${updated.id})`);
      setFormError(null);
      queryClient.invalidateQueries({ queryKey: ["product", productNumericId] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error: Error) => setFormError(error.message),
  });

  const syncAxonautStock = useMutation({
    mutationFn: () => api.axonautSyncStock({ productIds: [productNumericId] }),
    onSuccess: (res) => {
      const result = res.results?.[0];
      if (result?.ok) {
        setMessage(
          `Stock Axonaut mis à jour (produit #${productNumericId} → ${result.stock ?? "?"}).`,
        );
      } else {
        setMessage(result?.error ?? "Synchronisation Axonaut incomplète.");
      }
    },
    onError: (error: Error) => setMessage(error.message),
  });

  const handleSaveProduct = (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setMessage(null);
    const parsedPriceVdiHt = Number(editFields.priceVdiHt);
    const parsedPriceDistributorHt = Number(editFields.priceDistributorHt);
    const parsedPriceSaleHt = Number(editFields.priceSaleHt || editFields.price);
    const parsedPurchasePrice = Number(editFields.purchasePrice);
    const parsedTvaRate = Number(editFields.tvaRate);
    const parsedStockThreshold = Number(editFields.stockThreshold);
    const fallbackPrice = Number.isFinite(parsedPriceSaleHt)
      ? parsedPriceSaleHt
      : Number.isFinite(parsedPriceVdiHt)
        ? parsedPriceVdiHt
        : Number.isFinite(parsedPriceDistributorHt)
          ? parsedPriceDistributorHt
          : Number.NaN;
    const parsedFamilyId = editFields.familyId ? Number(editFields.familyId) : null;
    const parsedSubFamilyId = editFields.subFamilyId ? Number(editFields.subFamilyId) : null;
    const { payload, errors } = validateProductPayload(
      {
        name: editFields.name,
        sku: editFields.sku,
        stockThreshold: parsedStockThreshold,
        price: fallbackPrice,
        priceVdiHt: parsedPriceVdiHt,
        priceDistributorHt: parsedPriceDistributorHt,
        priceSaleHt: parsedPriceSaleHt,
        purchasePrice: parsedPurchasePrice,
        tvaRate: parsedTvaRate,
        description: editFields.description || null,
        isActive: editFields.isActive,
        familyId: parsedFamilyId,
        subFamilyId: parsedSubFamilyId,
        packagingId: editFields.packagingId ?? null,
      },
      { partial: false },
    );

    if (errors.length > 0) {
      setFormError(errors.join(" · "));
      return;
    }

    saveProduct.mutate(payload as ProductUpdateInput);
  };

  if (!Number.isInteger(productNumericId) || productNumericId <= 0) {
    return <Navigate to="/products" replace />;
  }

  if (isError) {
    return (
      <div className="panel">
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
  const displayTvaRate = editMode ? Number(editFields.tvaRate) : Number(product.tvaRate ?? 0);
  const displayPriceVdiHt = editMode ? Number(editFields.priceVdiHt) : Number(product.priceVdiHt ?? 0);
  const displayPriceDistributorHt = editMode
    ? Number(editFields.priceDistributorHt)
    : Number(product.priceDistributorHt ?? 0);
  const displayPriceSaleHt = editMode ? Number(editFields.priceSaleHt) : Number(product.priceSaleHt ?? 0);
  const purchasePriceValue = editMode ? Number(editFields.purchasePrice) : Number(product.purchasePrice ?? 0);
  const displayStockThreshold = editMode ? Number(editFields.stockThreshold) : Number(product.stockThreshold ?? 0);
  const priceVdiTtc = computeTtcValue(displayPriceVdiHt, displayTvaRate);
  const priceDistributorTtc = computeTtcValue(displayPriceDistributorHt, displayTvaRate);
  const priceSaleTtc = computeTtcValue(displayPriceSaleHt, displayTvaRate);

  return (
    <div className="space-y-6">
      <div className="glass-panel p-5 space-y-4">
        <form className="space-y-4" onSubmit={handleSaveProduct}>
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex-1 min-w-[260px] space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wide text-ink-500">{product.sku}</span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    product.isActive ?? true ? "bg-emerald-50 text-emerald-700" : "bg-ink-100 text-ink-700"
                  }`}
                >
                  {product.isActive ?? true ? "Actif" : "Archivé"}
                </span>
              </div>
              {editMode ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    value={editFields.name}
                    onChange={(e) => setEditFields((prev) => ({ ...prev, name: e.target.value }))}
                    className="input text-lg font-semibold text-ink-900"
                    placeholder="Nom du produit"
                    required
                  />
                  <input
                    value={editFields.sku}
                    readOnly
                    disabled
                    className="input bg-ink-50 text-ink-500"
                    placeholder="SKU"
                    title="Le SKU n'est pas modifiable"
                    required
                  />
                </div>
              ) : (
                <h1 className="text-2xl font-semibold text-ink-900">{product.name}</h1>
              )}
              {editMode ? (
                <textarea
                  value={editFields.description}
                  onChange={(e) => setEditFields((prev) => ({ ...prev, description: e.target.value }))}
                  className="input"
                  rows={2}
                  placeholder="Description"
                />
              ) : (
                <p className="text-sm text-ink-600">{product.description || "Aucune description pour le moment."}</p>
              )}
            </div>
            <div className="min-w-[240px] space-y-2 text-right">
              <div className="flex flex-wrap items-center justify-end gap-2">
                <span className="text-xs text-ink-500">Mode</span>
                <button
                  type="button"
                  onClick={() => setEditMode(false)}
                  className={["btn btn-xs", !editMode ? "btn-secondary" : "btn-muted"].join(" ")}
                >
                  Consultation
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (product) {
                      setEditFields({
                        name: product.name ?? "",
                        sku: product.sku ?? "",
                        stockThreshold: product.stockThreshold !== undefined ? String(product.stockThreshold) : "0",
                        price:
                          product.priceSaleHt !== undefined
                            ? String(product.priceSaleHt)
                            : product.price !== undefined
                              ? String(product.price)
                              : "",
                        priceVdiHt: product.priceVdiHt !== undefined ? String(product.priceVdiHt) : "",
                        priceDistributorHt:
                          product.priceDistributorHt !== undefined ? String(product.priceDistributorHt) : "",
                        priceSaleHt: product.priceSaleHt !== undefined ? String(product.priceSaleHt) : "",
                        purchasePrice: product.purchasePrice !== undefined ? String(product.purchasePrice) : "",
                        tvaRate: product.tvaRate !== undefined ? String(product.tvaRate) : "",
                        packagingId: product.packagingId ?? null,
                        description: product.description ?? "",
                        isActive: product.isActive ?? true,
                        familyId: product.family?.id ?? null,
                        subFamilyId: product.subFamily?.id ?? null,
                      });
                      setPackagingSearch(product.packaging?.name ?? "");
                    }
                    setEditMode(true);
                  }}
                  className={["btn btn-xs", editMode ? "btn-secondary" : "btn-muted"].join(" ")}
                >
                  Modification
                </button>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <StockBadge quantity={stock?.stock} />
                {!hasInventory ? <InventoryStatusBadge /> : null}
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const next = !(product.isActive ?? true);
                    setEditFields((prev) => ({ ...prev, isActive: next }));
                    saveProduct.mutate({ isActive: next });
                  }}
                  className="btn btn-muted btn-sm"
                  title={product.isActive ?? true ? "Archiver le produit" : "Réactiver le produit"}
                >
                  {product.isActive ?? true ? "Archiver" : "Réactiver"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowMovementModal(true)}
                  className="btn btn-primary"
                  disabled={locations.length === 0}
                >
                  Ajuster / inventaire
                </button>
              </div>

              <div className="rounded-lg border border-ink-100 bg-white p-3 text-left">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-ink-800">Axonaut</p>
                  {product.axonautProductId ? (
                    <span className="pill bg-ink-100 text-ink-700">#{product.axonautProductId}</span>
                  ) : (
                    <span className="text-xs text-ink-400">Non lié</span>
                  )}
                </div>
                <p className="mt-1 text-xs text-ink-600">
                  Stock envoyé : <span className="font-semibold text-ink-800">{stockQuantity}</span>
                </p>
                <button
                  type="button"
                  onClick={() => syncAxonautStock.mutate()}
                  className="btn btn-outline btn-sm mt-2 w-full"
                  disabled={
                    syncAxonautStock.isPending ||
                    !product.axonautProductId ||
                    axonautConfig.data?.hasApiKey !== true
                  }
                  title={
                    axonautConfig.data?.hasApiKey !== true
                      ? "Ajoutez une clé Axonaut dans les réglages."
                      : undefined
                  }
                >
                  {syncAxonautStock.isPending ? "Mise à jour Axonaut…" : "Mettre à jour le stock Axonaut"}
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="card p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wide text-ink-500">Catégorisation</p>
                {!editMode && (product.family || product.subFamily) ? (
                  <span className="text-xs text-ink-400">Non modifiable en consultation</span>
                ) : null}
              </div>
              <div className="mt-2">
                {editMode ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs uppercase tracking-wide text-ink-500">Familles</span>
                      <button
                        type="button"
                        onClick={() =>
                          setEditFields((prev) => ({ ...prev, familyId: null, subFamilyId: null }))
                        }
                        className={["btn btn-sm", !editFields.familyId ? "btn-secondary" : "btn-outline"].join(" ")}
                      >
                        Aucune
                      </button>
                      {familyOptions.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            setEditFields((prev) => ({
                              ...prev,
                              familyId: opt.id,
                              subFamilyId: prev.familyId === opt.id ? prev.subFamilyId : null,
                            }))
                          }
                          className={["btn btn-sm", editFields.familyId === opt.id ? "btn-secondary" : "btn-outline"].join(" ")}
                        >
                          {opt.name}
                        </button>
                      ))}
                    </div>
                    {editFields.familyId ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs uppercase tracking-wide text-ink-500">Sous-familles</span>
                        <button
                          type="button"
                          onClick={() => setEditFields((prev) => ({ ...prev, subFamilyId: null }))}
                          className={["btn btn-sm", !editFields.subFamilyId ? "btn-secondary" : "btn-outline"].join(" ")}
                        >
                          Aucune
                        </button>
                        {subFamilyOptions
                          .filter((opt) => opt.familyId === editFields.familyId)
                          .map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setEditFields((prev) => ({ ...prev, subFamilyId: opt.id }))}
                              className={["btn btn-sm", editFields.subFamilyId === opt.id ? "btn-secondary" : "btn-outline"].join(" ")}
                            >
                              {subFamilyNameMap.get(opt.id) ?? opt.id}
                            </button>
                          ))}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    {product.family ? (
                      <span className="pill bg-ink-100 text-ink-800">Famille : {product.family.name}</span>
                    ) : (
                      <span className="pill bg-ink-50 text-ink-700">Famille : —</span>
                    )}
                    {product.subFamily ? (
                      <span className="pill bg-ink-50 text-ink-800">Sous-famille : {product.subFamily.name}</span>
                    ) : (
                      <span className="pill bg-ink-50 text-ink-700">Sous-famille : —</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="card p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wide text-ink-500">Logistique & TVA</p>
                <span className="text-xs text-ink-400">HT + rappel TTC</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="text-xs font-semibold text-ink-600">
                  Prix d'achat HT
                  {editMode ? (
                    <input
                      type="number"
                      step="0.01"
                      value={editFields.purchasePrice}
                      onChange={(e) => setEditFields((prev) => ({ ...prev, purchasePrice: e.target.value }))}
                      className="mt-1 input"
                      required
                    />
                  ) : (
                    <div className="text-sm text-ink-900">{formatHtValue(purchasePriceValue)}</div>
                  )}
                </label>
                <label className="text-xs font-semibold text-ink-600">
                  Taux de TVA
                  {editMode ? (
                    <input
                      type="number"
                      step="0.01"
                      value={editFields.tvaRate}
                      onChange={(e) => setEditFields((prev) => ({ ...prev, tvaRate: e.target.value }))}
                      className="mt-1 input"
                      required
                    />
                  ) : (
                    <div className="text-sm text-ink-900">
                      {Number.isFinite(displayTvaRate) ? `${displayTvaRate.toFixed(2)} %` : "—"}
                    </div>
                  )}
                </label>
                <label className="text-xs font-semibold text-ink-600">
                  Seuil stock
                  {editMode ? (
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={editFields.stockThreshold}
                      onChange={(e) => setEditFields((prev) => ({ ...prev, stockThreshold: e.target.value }))}
                      className="mt-1 input"
                      required
                    />
                  ) : (
                    <div className="text-sm text-ink-900">{Number.isFinite(displayStockThreshold) ? `${displayStockThreshold} unités` : "—"}</div>
                  )}
                </label>
              </div>
              <label className="text-xs font-semibold text-ink-600">
                Conditionnement
                {editMode ? (
                  <div className="mt-1">
                    <SearchSelect
                      placeholder="Conditionnement"
                      valueId={editFields.packagingId ?? undefined}
                      search={packagingSearch}
                      onSearch={setPackagingSearch}
                      options={packagingOptions.filter((opt) =>
                        opt.label.toLowerCase().includes(packagingSearch.toLowerCase()),
                      )}
                      onSelect={(opt) => {
                        setEditFields((prev) => ({ ...prev, packagingId: opt ? Number(opt.id) : null }));
                        setPackagingSearch(opt?.label ?? "");
                      }}
                    />
                  </div>
                ) : (
                  <div className="mt-1 text-sm text-ink-900">{product.packaging?.name ?? "—"}</div>
                )}
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-ink-800">Tarifs</h4>
              <p className="text-xs text-ink-500">TTC calculé automatiquement</p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="card p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-wide text-ink-500">Tarif VDI</p>
                  {priceVdiTtc > 0 ? <span className="text-[11px] text-ink-500">TTC {priceVdiTtc.toFixed(2)} €</span> : null}
                </div>
                {editMode ? (
                  <input
                    type="number"
                    step="0.01"
                    value={editFields.priceVdiHt}
                    onChange={(e) => setEditFields((prev) => ({ ...prev, priceVdiHt: e.target.value }))}
                    className="mt-2 input"
                    required
                  />
                ) : (
                  <p className="mt-2 text-sm font-semibold text-ink-900">{formatHtValue(displayPriceVdiHt)}</p>
                )}
              </div>
              <div className="card p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-wide text-ink-500">Tarif Distributeur</p>
                  {priceDistributorTtc > 0 ? (
                    <span className="text-[11px] text-ink-500">TTC {priceDistributorTtc.toFixed(2)} €</span>
                  ) : null}
                </div>
                {editMode ? (
                  <input
                    type="number"
                    step="0.01"
                    value={editFields.priceDistributorHt}
                    onChange={(e) => setEditFields((prev) => ({ ...prev, priceDistributorHt: e.target.value }))}
                    className="mt-2 input"
                    required
                  />
                ) : (
                  <p className="mt-2 text-sm font-semibold text-ink-900">{formatHtValue(displayPriceDistributorHt)}</p>
                )}
              </div>
              <div className="card p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-wide text-ink-500">Prix de vente</p>
                  {priceSaleTtc > 0 ? <span className="text-[11px] text-ink-500">TTC {priceSaleTtc.toFixed(2)} €</span> : null}
                </div>
                {editMode ? (
                  <input
                    type="number"
                    step="0.01"
                    value={editFields.priceSaleHt}
                    onChange={(e) =>
                      setEditFields((prev) => ({ ...prev, priceSaleHt: e.target.value, price: e.target.value }))
                    }
                    className="mt-2 input"
                    required
                  />
                ) : (
                  <p className="mt-2 text-sm font-semibold text-ink-900">{formatHtValue(displayPriceSaleHt)}</p>
                )}
              </div>
            </div>
          </div>

          {editMode ? (
            <div className="flex items-center justify-end">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saveProduct.isPending}
              >
                {saveProduct.isPending ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          ) : null}
        </form>
        {message ? <p className="mt-2 text-xs text-ink-600">{message}</p> : null}
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="card p-3">
            <p className="text-xs text-ink-500">Stock actuel</p>
            <div className="mt-1 flex items-center justify-between">
              <p className="text-lg font-semibold text-ink-900">{stockQuantity} unités</p>
              <StockBadge quantity={stockQuantity} />
            </div>
            <p className="text-xs text-ink-500">Seuil : {displayStockThreshold} unités</p>
            <p className="text-xs text-ink-500">Synchronisé via mouvements et inventaires.</p>
          </div>
          <div className="card p-3">
            <p className="text-xs text-ink-500">Dernier inventaire</p>
            <p className="text-lg font-semibold text-ink-900">
              {inventories[0]?.quantity ?? "—"} unités
            </p>
            <p className="text-xs text-ink-500">
              {inventories[0] ? new Date(inventories[0].createdAt).toLocaleString("fr-FR") : "Aucun inventaire"}
            </p>
          </div>
          <div className="card p-3">
            <p className="text-xs text-ink-500">Emplacement par défaut</p>
            <p className="text-lg font-semibold text-ink-900">
              {locations.find((l) => l.isDefault)?.name ?? "Non défini"}
            </p>
            <p className="text-xs text-ink-500">{locations.length} emplacements</p>
          </div>
        </div>
      </div>

      {formError ? <p className="text-xs text-amber-700">{formError}</p> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-ink-900">Mouvements</h3>
          </div>
          <div className="mt-3">
            <StockChart data={chartData} threshold={product.stockThreshold ?? 0} />
          </div>
        </div>

        <div className="panel">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-ink-900">Variations</h3>
          </div>
          <div className="mt-3 space-y-2">
            {variations.length === 0 ? (
              <p className="text-sm text-ink-600">Aucune variation.</p>
            ) : (
              variations.map((variation) => (
                <div key={variation.id} className="card flex items-center justify-between px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-ink-900">
                      {variation.quantityDelta > 0 ? "+" : ""}
                      {variation.quantityDelta} unités
                    </p>
                    <p className="text-xs text-ink-500">
                      {(() => {
                        const parsed = parseStockMovementReason(variation.reason);
                        const label = parsed.code ? formatReasonLabel(parsed.code) : variation.reason;
                        const reference = variation.sourceDocumentId ?? parsed.details;
                        const display = reference ? `${label} · ${reference}` : label;
                        return display || String(variation.stockLocationId);
                      })()}
                    </p>
                  </div>
                  <p className="text-xs text-ink-500">{new Date(variation.createdAt).toLocaleString("fr-FR")}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-ink-900">Inventaires</h3>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {inventories.length === 0 ? (
            <p className="text-sm text-ink-600">Aucun inventaire pour ce produit.</p>
          ) : (
            inventories.map((inv) => (
              <div key={inv.id} className="card px-3 py-2">
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

      <MovementInventoryModal
        open={showMovementModal}
        onOpenChange={setShowMovementModal}
        products={product ? [product] : []}
        locations={locations}
        defaultProductId={product?.id}
        defaultLocationId={locations.find((l) => l.isDefault)?.id ?? locations[0]?.id}
        subtitle="Ajustement depuis la fiche produit"
        showTrigger={false}
      />
    </div>
  );
}

export default ProductDetail;
