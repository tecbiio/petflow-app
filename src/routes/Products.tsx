import { FormEvent, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import ProductCard from "../components/ProductCard";
import { useProducts } from "../hooks/useProducts";
import { api } from "../api/client";
import StockBadge from "../components/StockBadge";
import { useStockLocations } from "../hooks/useStockLocations";
import { useProductThresholds } from "../hooks/useProductThresholds";

function Products() {
  const queryClient = useQueryClient();
  const { getThreshold, setThreshold, defaultThreshold } = useProductThresholds();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [activeOnly, setActiveOnly] = useState(true);
  const [newName, setNewName] = useState("");
  const [newSku, setNewSku] = useState("");
  const [newPrice, setNewPrice] = useState<string>("");
  const [newDescription, setNewDescription] = useState("");
  const [newIsActive, setNewIsActive] = useState(true);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const { data: products = [], isLoading } = useProducts({ active: activeOnly ? true : undefined });
  const { data: locations = [] } = useStockLocations();

  const stockQueries = useQueries({
    queries:
      products?.map((product) => ({
        queryKey: ["stock", product.id],
        queryFn: () => api.getStockForProduct(product.id),
        enabled: products.length > 0,
      })) ?? [],
  });

  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          (p.sku ?? "").toLowerCase().includes(search.toLowerCase()),
      ),
    [products, search],
  );

  const selected = useMemo(() => products.find((p) => p.id === selectedId) ?? filtered[0], [filtered, products, selectedId]);
  const selectedStock = selected
    ? stockQueries[products.findIndex((p) => p.id === selected.id)]?.data?.stock ?? 0
    : undefined;
  const selectedThreshold = selected ? getThreshold(selected.id) : defaultThreshold;

  const createProduct = useMutation({
    mutationFn: api.createProduct,
    onSuccess: (created) => {
      setFormMessage("Produit créé via PUT /products");
      setNewName("");
      setNewSku("");
      setNewPrice("");
      setNewDescription("");
      setNewIsActive(true);
      setSelectedId(created.id);
      queryClient.invalidateQueries({ queryKey: ["products"] });
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
      isActive: newIsActive,
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink-900">Produits</p>
            <p className="text-xs text-ink-500">Liste issue de /products {activeOnly ? "(actifs)" : "(tous)"}</p>
          </div>
          <div className="flex w-full max-w-xl items-center gap-2">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom ou SKU"
              className="w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm shadow-sm"
            />
            <button
              type="button"
              onClick={() => setActiveOnly((prev) => !prev)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                activeOnly ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-700"
              }`}
              title="Ajoute ?active=true sur /products"
            >
              {activeOnly ? "Actifs" : "Tous"}
            </button>
          </div>
        </div>
        {isLoading ? <p className="text-sm text-ink-500">Chargement…</p> : null}
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((product) => {
            const stock = stockQueries[products.findIndex((p) => p.id === product.id)]?.data?.stock ?? 0;
            return (
              <ProductCard
                key={product.id}
                product={product}
                stock={stock}
                onPreview={() => setSelectedId(product.id)}
              />
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <div className="glass-panel sticky top-24 h-fit p-4">
          <p className="text-sm font-semibold text-ink-900">Aperçu produit</p>
          {selected ? (
            <div className="mt-3 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-lg font-semibold text-ink-900">{selected.name}</p>
                  <p className="text-sm text-ink-500">{selected.description}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    selected.isActive ?? true ? "bg-emerald-50 text-emerald-700" : "bg-ink-100 text-ink-700"
                  }`}
                >
                  {selected.isActive ?? true ? "Actif" : "Archivé"}
                </span>
              </div>
              <StockBadge quantity={selectedStock} threshold={selectedThreshold} />
              <div className="text-xs text-ink-600">
                <p>SKU: {selected.sku}</p>
                <p>Prix: {Number.isFinite(selected.price) ? `${selected.price.toFixed(2)} €` : "—"}</p>
                <p>Créé le: {new Date(selected.createdAt).toLocaleDateString("fr-FR")}</p>
                <p>Emplacement par défaut: {locations.find((l) => l.isDefault)?.name ?? "—"}</p>
              </div>
              <label className="text-xs font-semibold text-ink-800">
                Seuil spécifique ({selectedThreshold})
                <input
                  type="number"
                  value={selectedThreshold}
                  onChange={(e) => setThreshold(selected.id, Number(e.target.value))}
                  className="mt-1 w-24 rounded-lg border border-ink-100 px-2 py-1 text-xs"
                  min={0}
                />
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to={`/products/${selected.id}`}
                  className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-card"
                >
                  Voir la fiche complète
                </Link>
                <button
                  type="button"
                  onClick={() => toggleActive.mutate({ id: selected.id, isActive: !(selected.isActive ?? true) })}
                  className="rounded-lg bg-ink-100 px-3 py-2 text-xs font-semibold text-ink-700"
                  title="PATCH /products/:id avec isActive"
                >
                  {selected.isActive ?? true ? "Archiver" : "Réactiver"}
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-ink-600">Sélectionnez un produit pour prévisualiser.</p>
          )}
        </div>

        <div className="glass-panel p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-ink-900">Créer un produit</p>
            <span className="pill bg-brand-50 text-brand-700">PUT /products</span>
          </div>
          <form className="mt-3 space-y-3" onSubmit={handleCreate}>
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
              <label className="flex items-center gap-2 text-sm font-semibold text-ink-800">
                <input
                  type="checkbox"
                  checked={newIsActive}
                  onChange={(e) => setNewIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-ink-300"
                />
                Actif (queryParam active=true sur la liste)
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
              {formMessage ? <p className="text-xs text-ink-600">{formMessage}</p> : <span className="text-xs text-ink-500">Envoi JSON: name, sku, price, description, isActive</span>}
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
      </div>
    </div>
  );
}

export default Products;
