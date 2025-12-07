import { Link, Navigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

function ProductDetail() {
  const { productId = "" } = useParams();
  const productNumericId = Number(productId);
  type ProductUpdateInput = {
    name?: string;
    sku?: string;
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
  const hasInventory = inventories.length > 0;

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

  const handleSaveProduct = (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setMessage(null);
    const parsedPrice = Number(editFields.price);
    const parsedPriceVdiHt = Number(editFields.priceVdiHt);
    const parsedPriceDistributorHt = Number(editFields.priceDistributorHt);
    const parsedPriceSaleHt = Number(editFields.priceSaleHt || editFields.price);
    const parsedPurchasePrice = Number(editFields.purchasePrice);
    const parsedTvaRate = Number(editFields.tvaRate);
    const parsedFamilyId = editFields.familyId ? Number(editFields.familyId) : null;
    const parsedSubFamilyId = editFields.subFamilyId ? Number(editFields.subFamilyId) : null;
    const { payload, errors } = validateProductPayload(
      {
        name: editFields.name,
        sku: editFields.sku,
        price: parsedPrice,
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

  return (
    <div className="space-y-6">
      <div className="glass-panel p-5">
        <form className="space-y-2" onSubmit={handleSaveProduct}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex-1 min-w-[260px]">
              <p className="text-xs uppercase tracking-wide text-ink-500">{product.sku}</p>
              {editMode ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    value={editFields.name}
                    onChange={(e) => setEditFields((prev) => ({ ...prev, name: e.target.value }))}
                    className="rounded-lg border border-ink-100 bg-white px-3 py-2 text-lg font-semibold text-ink-900"
                    placeholder="Nom du produit"
                    required
                  />
                  <input
                    value={editFields.sku}
                    onChange={(e) => setEditFields((prev) => ({ ...prev, sku: e.target.value }))}
                    className="rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm"
                    placeholder="SKU"
                    required
                  />
                </div>
              ) : (
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
              )}
              {editMode ? (
                <textarea
                  value={editFields.description}
                  onChange={(e) => setEditFields((prev) => ({ ...prev, description: e.target.value }))}
                  className="mt-2 w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm"
                  rows={2}
                  placeholder="Description"
                />
              ) : (
                <p className="text-sm text-ink-600">{product.description}</p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {editMode ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs uppercase tracking-wide text-ink-500">Familles</span>
                      <button
                        type="button"
                        onClick={() =>
                          setEditFields((prev) => ({ ...prev, familyId: null, subFamilyId: null }))
                        }
                        className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                          !editFields.familyId ? "bg-ink-900 text-white shadow-card" : "text-ink-700 hover:bg-ink-50"
                        }`}
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
                          className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                            editFields.familyId === opt.id
                              ? "bg-ink-900 text-white shadow-card"
                              : "text-ink-700 hover:bg-ink-50"
                          }`}
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
                          className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                            !editFields.subFamilyId
                              ? "bg-ink-900 text-white shadow-card"
                              : "text-ink-700 hover:bg-ink-50"
                          }`}
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
                              className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                                editFields.subFamilyId === opt.id
                                  ? "bg-ink-900 text-white shadow-card"
                                  : "text-ink-700 hover:bg-ink-50"
                              }`}
                            >
                              {subFamilyNameMap.get(opt.id) ?? opt.id}
                            </button>
                          ))}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <>
                    {product.family ? (
                      <span className="pill bg-ink-100 text-ink-800">Famille : {product.family.name}</span>
                    ) : null}
                    {product.subFamily ? (
                      <span className="pill bg-ink-50 text-ink-800">Sous-famille : {product.subFamily.name}</span>
                    ) : null}
                  </>
                )}
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <label className="text-xs font-semibold text-ink-600">
                  Tarif VDI HT
                  {editMode ? (
                    <input
                      type="number"
                      step="0.01"
                      value={editFields.priceVdiHt}
                      onChange={(e) => setEditFields((prev) => ({ ...prev, priceVdiHt: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm"
                      required
                    />
                  ) : (
                    <div className="text-sm text-ink-900">
                      {Number(product.priceVdiHt ?? 0).toFixed(2)} €
                    </div>
                  )}
                </label>
                <label className="text-xs font-semibold text-ink-600">
                  Tarif Distributeur HT
                  {editMode ? (
                    <input
                      type="number"
                      step="0.01"
                      value={editFields.priceDistributorHt}
                      onChange={(e) => setEditFields((prev) => ({ ...prev, priceDistributorHt: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm"
                      required
                    />
                  ) : (
                    <div className="text-sm text-ink-900">
                      {Number(product.priceDistributorHt ?? 0).toFixed(2)} €
                    </div>
                  )}
                </label>
                <label className="text-xs font-semibold text-ink-600">
                  Prix de vente HT
                  {editMode ? (
                    <input
                      type="number"
                      step="0.01"
                      value={editFields.priceSaleHt}
                      onChange={(e) => setEditFields((prev) => ({ ...prev, priceSaleHt: e.target.value, price: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm"
                      required
                    />
                  ) : (
                    <div className="text-sm text-ink-900">{Number(product.priceSaleHt ?? 0).toFixed(2)} €</div>
                  )}
                </label>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <label className="text-xs font-semibold text-ink-600">
                  Prix d'achat
                  {editMode ? (
                    <input
                      type="number"
                      step="0.01"
                      value={editFields.purchasePrice}
                      onChange={(e) => setEditFields((prev) => ({ ...prev, purchasePrice: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm"
                      required
                    />
                  ) : (
                    <div className="text-sm text-ink-900">{Number(product.purchasePrice ?? 0).toFixed(2)} €</div>
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
                      className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm"
                      required
                    />
                  ) : (
                    <div className="text-sm text-ink-900">{Number(product.tvaRate ?? 0).toFixed(2)} %</div>
                  )}
                </label>
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
                    <div className="text-sm text-ink-900">{product.packaging?.name ?? "—"}</div>
                  )}
                </label>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StockBadge quantity={stock?.stock} />
              {!hasInventory ? <InventoryStatusBadge /> : null}
              <button
                type="button"
                onClick={() => {
                  const next = !(product.isActive ?? true);
                  setEditFields((prev) => ({ ...prev, isActive: next }));
                  saveProduct.mutate({ isActive: next });
                }}
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
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-ink-500">Mode</span>
            <button
              type="button"
              onClick={() => setEditMode(false)}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                !editMode ? "bg-ink-900 text-white shadow-card" : "bg-ink-100 text-ink-700"
              }`}
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
              className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                editMode ? "bg-ink-900 text-white shadow-card" : "bg-ink-100 text-ink-700"
              }`}
            >
              Modification
            </button>
            {editMode ? (
              <button
                type="submit"
                className="ml-auto rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-card disabled:opacity-60"
                disabled={saveProduct.isPending}
              >
                {saveProduct.isPending ? "Enregistrement…" : "Enregistrer"}
              </button>
            ) : null}
          </div>
        </form>
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

      {formError ? <p className="text-xs text-amber-700">{formError}</p> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass-panel p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-ink-900">Mouvements</h3>
          </div>
          <div className="mt-3">
            <StockChart data={chartData} />
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
