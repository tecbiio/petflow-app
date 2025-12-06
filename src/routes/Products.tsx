import { FormEvent, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { useProducts } from "../hooks/useProducts";
import { api } from "../api/client";
import { Inventory } from "../types";

function Products() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeOnly, setActiveOnly] = useState(true);
  const [familyFilter, setFamilyFilter] = useState<string>("");
  const [subFamilyFilter, setSubFamilyFilter] = useState<string>("");
  const [newName, setNewName] = useState("");
  const [newSku, setNewSku] = useState("");
  const [newPrice, setNewPrice] = useState<string>("");
  const [newDescription, setNewDescription] = useState("");
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const navigate = useNavigate();
  const { data: products = [], isLoading } = useProducts({ active: activeOnly ? true : undefined });
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
    products.forEach((p) => {
      if (p.family?.name) values.add(p.family.name);
    });
    return Array.from(values).sort();
  }, [products]);

  const subFamilies = useMemo(() => {
    const values = new Set<string>();
    products.forEach((p) => {
      if (familyFilter && p.family?.name !== familyFilter) return;
      if (p.subFamily?.name) values.add(p.subFamily.name);
    });
    return Array.from(values).sort();
  }, [familyFilter, products]);

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
      setFormMessage("Produit créé via PUT /products");
      setNewName("");
      setNewSku("");
      setNewPrice("");
      setNewDescription("");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setShowCreateModal(false);
      navigate(`/products/${created.id}`);
    },
    onError: (error: Error) => {
      setFormMessage(error.message);
    },
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => api.updateProduct(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setFormMessage("Statut produit mis à jour via PATCH /products/:id");
    },
    onError: (error: Error) => setFormMessage(error.message),
  });

  const handleCreate = (event: FormEvent) => {
    event.preventDefault();
    setFormMessage(null);
    const price = Number(newPrice);
    if (!newName || !newSku || Number.isNaN(price)) {
      setFormMessage("Renseignez au moins nom, SKU et prix.");
      return;
    }
    createProduct.mutate({
      name: newName,
      sku: newSku,
      price,
      description: newDescription || null,
    });
  };

  return (
    <div className="space-y-4">
      <div className="glass-panel flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="text-lg font-semibold text-ink-900">Catalogue produits</p>
          <p className="text-xs text-ink-500">Consulte, filtre ou ajoute de nouveaux produits.</p>
        </div>
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
      </div>

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
                    <h3 className="text-lg font-semibold text-ink-900">Créer un produit</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="rounded-full bg-ink-100 px-3 py-1 text-xs font-semibold text-ink-700"
                  >
                    Fermer
                  </button>
                </div>
                <form className="mt-4 space-y-3" onSubmit={handleCreate}>
                  <label className="block text-sm text-ink-700">
                    Nom
                    <input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2"
                      placeholder="Friandises saumon"
                    />
                  </label>
                  <div className="grid gap-3 md:grid-cols-3">
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
                      Prix (€)
                      <input
                        value={newPrice}
                        onChange={(e) => setNewPrice(e.target.value)}
                        type="number"
                        step="0.01"
                        className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2"
                        placeholder="9.90"
                      />
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
                    <button
                      type="submit"
                      className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-card"
                      disabled={createProduct.isPending}
                    >
                      {createProduct.isPending ? "Création…" : "Créer"}
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

export default Products;
