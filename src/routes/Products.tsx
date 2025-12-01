import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import ProductCard from "../components/ProductCard";
import { useProducts } from "../hooks/useProducts";
import { api } from "../api/client";
import StockBadge from "../components/StockBadge";
import { useStockLocations } from "../hooks/useStockLocations";

const LOW_STOCK_FALLBACK = 5;

function Products() {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { data: products = [], isLoading } = useProducts();
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

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink-900">Produits</p>
            <p className="text-xs text-ink-500">Liste issue de /products</p>
          </div>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou SKU"
            className="w-full max-w-sm rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm shadow-sm"
          />
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

      <div className="glass-panel sticky top-24 h-fit p-4">
        <p className="text-sm font-semibold text-ink-900">Aperçu produit</p>
        {selected ? (
          <div className="mt-3 space-y-2">
            <p className="text-lg font-semibold text-ink-900">{selected.name}</p>
            <p className="text-sm text-ink-500">{selected.description}</p>
            <StockBadge quantity={selectedStock} threshold={LOW_STOCK_FALLBACK} />
            <div className="text-xs text-ink-600">
              <p>SKU: {selected.sku}</p>
              <p>Prix: {Number.isFinite(selected.price) ? `${selected.price.toFixed(2)} €` : "—"}</p>
              <p>Créé le: {new Date(selected.createdAt).toLocaleDateString("fr-FR")}</p>
              <p>Emplacement par défaut: {locations.find((l) => l.isDefault)?.name ?? "—"}</p>
            </div>
            <Link
              to={`/products/${selected.id}`}
              className="mt-3 inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-card"
            >
              Voir la fiche complète
            </Link>
          </div>
        ) : (
          <p className="mt-3 text-sm text-ink-600">Sélectionnez un produit pour prévisualiser.</p>
        )}
      </div>
    </div>
  );
}

export default Products;
