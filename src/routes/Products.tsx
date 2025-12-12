import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { useProducts } from "../hooks/useProducts";
import { useFamilies } from "../hooks/useFamilies";
import { usePackagings } from "../hooks/usePackagings";
import { api } from "../api/client";
import { Inventory } from "../types";
import { validateProductPayload } from "../lib/constraints";
import SearchSelect from "../components/SearchSelect";
import Modal from "../components/ui/Modal";
import { useToast } from "../components/ToastProvider";
import PageHeader from "../components/ui/PageHeader";

function Products() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeOnly, setActiveOnly] = useState(true);
  const [familyFilter, setFamilyFilter] = useState<string>("");
  const [subFamilyFilter, setSubFamilyFilter] = useState<string>("");
  const [newName, setNewName] = useState("");
  const [newSku, setNewSku] = useState("");
  const [newPriceVdi, setNewPriceVdi] = useState<string>("");
  const [newPriceDistributor, setNewPriceDistributor] = useState<string>("");
  const [newPriceSale, setNewPriceSale] = useState<string>("");
  const [newPurchasePrice, setNewPurchasePrice] = useState<string>("");
  const [newTvaRate, setNewTvaRate] = useState<string>("");
  const [newPackagingId, setNewPackagingId] = useState<number | null>(null);
  const [newPackagingSearch, setNewPackagingSearch] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  const { data: products = [], isLoading } = useProducts({ active: activeOnly ? true : undefined });
  const { data: familiesData = [] } = useFamilies();
  const { data: packagings = [] } = usePackagings();
  const resetFilters = () => {
    setSearch("");
    setActiveOnly(true);
    setFamilyFilter("");
    setSubFamilyFilter("");
  };

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

  const families = useMemo(() => {
    const values = new Set<string>();
    familiesData.forEach((f) => values.add(f.name));
    products.forEach((p) => {
      if (p.family?.name) values.add(p.family.name);
    });
    return Array.from(values).sort();
  }, [familiesData, products]);

  const subFamilies = useMemo(() => {
    const values = new Set<string>();
    familiesData.forEach((f) => {
      if (familyFilter && f.name !== familyFilter) return;
      f.subFamilies?.forEach((s) => values.add(s.name));
    });
    products.forEach((p) => {
      if (familyFilter && p.family?.name !== familyFilter) return;
      if (p.subFamily?.name) values.add(p.subFamily.name);
    });
    return Array.from(values).sort();
  }, [familiesData, familyFilter, products]);

  const packagingOptions = useMemo(
    () => packagings.map((p) => ({ id: p.id, label: p.name })),
    [packagings],
  );

  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          (p.name.toLowerCase().includes(search.toLowerCase()) ||
            (p.sku ?? "").toLowerCase().includes(search.toLowerCase())) &&
          (!familyFilter || p.family?.name === familyFilter) &&
          (!subFamilyFilter || p.subFamily?.name === subFamilyFilter) &&
          (activeOnly ? p.isActive ?? true : true),
      ),
    [activeOnly, familyFilter, products, search, subFamilyFilter],
  );

  const createProduct = useMutation({
    mutationFn: api.createProduct,
    onSuccess: (created) => {
      toast("Produit créé", "success");
      setNewName("");
      setNewSku("");
      setNewPriceVdi("");
      setNewPriceDistributor("");
      setNewPriceSale("");
      setNewPurchasePrice("");
      setNewTvaRate("");
      setNewPackagingId(null);
      setNewPackagingSearch("");
      setNewDescription("");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setShowCreateModal(false);
      navigate(`/products/${created.id}`);
    },
    onError: (error: Error) => {
      setFormMessage(error.message);
      toast(error.message, "error");
    },
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => api.updateProduct(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast("Statut produit mis à jour", "success");
    },
    onError: (error: Error) => toast(error.message, "error"),
  });

  const handleCreate = (event: FormEvent) => {
    event.preventDefault();
    setFormMessage(null);
    const priceVdiHt = Number(newPriceVdi);
    const priceDistributorHt = Number(newPriceDistributor);
    const priceSaleHt = Number(newPriceSale);
    const purchasePrice = Number(newPurchasePrice);
    const tvaRate = Number(newTvaRate);
    const fallbackPrice = Number.isFinite(priceSaleHt)
      ? priceSaleHt
      : Number.isFinite(priceVdiHt)
        ? priceVdiHt
        : Number.isFinite(priceDistributorHt)
          ? priceDistributorHt
          : Number.NaN;
    const { payload, errors } = validateProductPayload(
      {
        name: newName,
        sku: newSku,
        price: fallbackPrice,
        priceVdiHt,
        priceDistributorHt,
        priceSaleHt,
        purchasePrice,
        tvaRate,
        description: newDescription || null,
        packagingId: newPackagingId ?? null,
      },
      { partial: false },
    );

    if (errors.length > 0) {
      setFormMessage(errors.join(" · "));
      toast("Corrige les champs requis.", "warning");
      return;
    }

    createProduct.mutate(payload as Required<typeof payload>);
    setNewPriceVdi("");
    setNewPriceDistributor("");
    setNewPriceSale("");
    setNewPurchasePrice("");
    setNewTvaRate("");
    setNewPackagingSearch("");
  };

  const parsedTvaRate = Number(newTvaRate);
  const computeTtc = (htValue: string) => {
    const ht = Number(htValue);
    if (!Number.isFinite(ht) || !Number.isFinite(parsedTvaRate) || ht === 0) return 0;
    return ht * (1 + parsedTvaRate / 100);
  };

  const priceVdiTtc = computeTtc(newPriceVdi);
  const priceDistributorTtc = computeTtc(newPriceDistributor);
  const priceSaleTtc = computeTtc(newPriceSale);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Catalogue produits"
        subtitle="Consulte, filtre ou ajoute de nouveaux produits."
        actions={
          <button
            type="button"
            onClick={() => {
              setFormMessage(null);
              setShowCreateModal(true);
            }}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-card"
          >
            Nouveau produit
          </button>
        }
      />

      <div className="glass-panel space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrer par nom ou SKU…"
            className="w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm shadow-sm md:w-64"
          />
          <button
            type="button"
            onClick={() => setActiveOnly((prev) => !prev)}
            className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
              activeOnly ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 bg-white text-ink-700"
            }`}
          >
            {activeOnly ? "Actifs" : "Tous"}
          </button>
          <span className="ml-auto text-sm font-semibold text-ink-700">{filtered.length} résultats</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-ink-500">Familles</span>
          <button
            type="button"
            onClick={() => {
              setFamilyFilter("");
              setSubFamilyFilter("");
            }}
            className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
              !familyFilter ? "bg-ink-900 text-white shadow-card" : "text-ink-700 hover:bg-ink-50"
            }`}
          >
            Toutes
          </button>
          {families.map((family) => (
            <button
              key={family}
              type="button"
              onClick={() => {
                setFamilyFilter(family);
                setSubFamilyFilter("");
              }}
              className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                familyFilter === family
                  ? "bg-ink-900 text-white shadow-card"
                  : "text-ink-700 hover:bg-ink-50"
              }`}
            >
              {family}
            </button>
          ))}
        </div>
        {familyFilter ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-ink-500">Sous-familles</span>
            <button
              type="button"
              onClick={() => setSubFamilyFilter("")}
              className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                !subFamilyFilter
                  ? "bg-ink-900 text-white shadow-card"
                  : "text-ink-700 hover:bg-ink-50"
              }`}
            >
              Toutes
            </button>
            {subFamilies.map((sub) => (
              <button
                key={sub}
                type="button"
                onClick={() => setSubFamilyFilter(sub)}
                className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                  subFamilyFilter === sub
                    ? "bg-ink-900 text-white shadow-card"
                    : "text-ink-700 hover:bg-ink-50"
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {isLoading ? <p className="text-sm text-ink-500">Chargement…</p> : null}
      <div className="grid gap-3 md:grid-cols-2">
        {filtered.map((product) => {
          const stock = stockQueries[products.findIndex((p) => p.id === product.id)]?.data?.stock ?? 0;
          const hasInventory = (inventoriesByProduct.get(product.id)?.length ?? 0) > 0;
          return (
            <ProductCard
              key={product.id}
              product={product}
              stock={stock}
              inventoryMissing={!hasInventory}
            />
          );
        })}
      </div>

      <Modal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        title="Créer un produit"
        size="lg"
        canClose={!createProduct.isPending}
      >
        <form className="space-y-3" onSubmit={handleCreate}>
                  <label className="block text-sm text-ink-700">
                    Nom
                    <input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2"
                      placeholder="Friandises saumon"
                    />
                  </label>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="text-sm text-ink-700">
                      SKU
                      <input
                        value={newSku}
                        onChange={(e) => setNewSku(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2"
                        placeholder="SKU-123"
                      />
                    </label>
                    <label className="text-sm text-ink-700">
                      Taux de TVA (%)
                      <input
                        value={newTvaRate}
                        onChange={(e) => setNewTvaRate(e.target.value)}
                        type="number"
                        step="0.01"
                        className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2"
                        placeholder="20"
                      />
                    </label>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <label className="text-sm text-ink-700">
                      Tarif VDI HT (€)
                      <div className="mt-1 space-y-1">
                        <input
                          value={newPriceVdi}
                          onChange={(e) => setNewPriceVdi(e.target.value)}
                          type="number"
                          step="0.01"
                          className="w-full rounded-lg border border-ink-100 bg-white px-3 py-2"
                          placeholder="8.50"
                        />
                        {priceVdiTtc > 0 ? (
                          <p className="text-xs text-ink-500">TTC : {priceVdiTtc.toFixed(2)} €</p>
                        ) : null}
                      </div>
                    </label>
                    <label className="text-sm text-ink-700">
                      Tarif Distributeur HT (€)
                      <div className="mt-1 space-y-1">
                        <input
                          value={newPriceDistributor}
                          onChange={(e) => setNewPriceDistributor(e.target.value)}
                          type="number"
                          step="0.01"
                          className="w-full rounded-lg border border-ink-100 bg-white px-3 py-2"
                          placeholder="7.90"
                        />
                        {priceDistributorTtc > 0 ? (
                          <p className="text-xs text-ink-500">TTC : {priceDistributorTtc.toFixed(2)} €</p>
                        ) : null}
                      </div>
                    </label>
                    <label className="text-sm text-ink-700">
                      Prix de vente HT (€)
                      <div className="mt-1 space-y-1">
                        <input
                          value={newPriceSale}
                          onChange={(e) => setNewPriceSale(e.target.value)}
                          type="number"
                          step="0.01"
                          className="w-full rounded-lg border border-ink-100 bg-white px-3 py-2"
                          placeholder="9.90"
                        />
                        {priceSaleTtc > 0 ? (
                          <p className="text-xs text-ink-500">TTC : {priceSaleTtc.toFixed(2)} €</p>
                        ) : null}
                      </div>
                    </label>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="text-sm text-ink-700">
                      Prix d'achat (€)
                      <input
                        value={newPurchasePrice}
                        onChange={(e) => setNewPurchasePrice(e.target.value)}
                        type="number"
                        step="0.01"
                        className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2"
                        placeholder="6.20"
                      />
                    </label>
                    <label className="text-sm text-ink-700">
                      Conditionnement
                      <div className="mt-1">
                        <SearchSelect
                          placeholder="Conditionnement"
                          valueId={newPackagingId ?? undefined}
                          search={newPackagingSearch}
                          onSearch={setNewPackagingSearch}
                          options={packagingOptions.filter((opt) =>
                            opt.label.toLowerCase().includes(newPackagingSearch.toLowerCase()),
                          )}
                          onSelect={(opt) => {
                            setNewPackagingId(opt ? Number(opt.id) : null);
                            setNewPackagingSearch(opt?.label ?? "");
                          }}
                        />
                      </div>
                    </label>
                  </div>
                  <label className="block text-sm text-ink-700">
                    Description
                    <textarea
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2"
                      placeholder="Détail produit"
                    />
                  </label>
                  <div className="flex items-center justify-between">
                    {formMessage ? <p className="text-xs text-ink-600">{formMessage}</p> : <span />}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowCreateModal(false)}
                        className="rounded-lg bg-ink-100 px-4 py-2 text-sm font-semibold text-ink-700 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={createProduct.isPending}
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-card disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={createProduct.isPending}
                      >
                        {createProduct.isPending ? "Création…" : "Créer"}
                      </button>
                    </div>
                  </div>
        </form>
      </Modal>
    </div>
  );
}

export default Products;
