import { FormEvent, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { Product, StockLocation } from "../types";

type Props = {
  products: Product[];
  locations: StockLocation[];
};

function InventoryEditor({ products, locations }: Props) {
  const queryClient = useQueryClient();
  const [productId, setProductId] = useState<number>(products[0]?.id ?? 0);
  const [locationId, setLocationId] = useState<number>(locations[0]?.id ?? 0);
  const [quantity, setQuantity] = useState(0);
  const [note, setNote] = useState("");
  const [mode, setMode] = useState<"partial" | "full">("partial");
  const [inventoryDate, setInventoryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [message, setMessage] = useState<string | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [locationSearch, setLocationSearch] = useState("");

  const createInventory = useMutation({
    mutationFn: api.createInventory,
    onSuccess: () => {
      setMessage("Inventaire créé via PUT /inventories");
      setQuantity(0);
      setNote("");
      queryClient.invalidateQueries({ queryKey: ["inventories", productId] });
      queryClient.invalidateQueries({ queryKey: ["stock", productId] });
    },
    onError: (error: Error) => setMessage(error.message),
  });

  useEffect(() => {
    const defaultProd = products[0]?.id;
    if (defaultProd) setProductId(defaultProd);
  }, [products]);

  useEffect(() => {
    const def = locations.find((l) => l.isDefault)?.id ?? locations[0]?.id;
    if (def) setLocationId(def);
  }, [locations]);

  const parsedDate = useMemo(() => new Date(inventoryDate), [inventoryDate]);
  const productOptions = useMemo(
    () =>
      products
        .filter((p) => p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.sku.toLowerCase().includes(productSearch.toLowerCase()))
        .map((p) => ({ id: p.id, label: p.name, hint: p.sku })),
    [productSearch, products],
  );
  const locationOptions = useMemo(
    () =>
      locations
        .filter((l) => l.name.toLowerCase().includes(locationSearch.toLowerCase()) || l.code.toLowerCase().includes(locationSearch.toLowerCase()))
        .map((l) => ({ id: l.id, label: l.name, hint: l.code, isDefault: l.isDefault })),
    [locationSearch, locations],
  );

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!productId || !locationId) {
      setMessage("Choisissez produit et emplacement.");
      return;
    }
    if (Number.isNaN(parsedDate.getTime())) {
      setMessage("Date invalide");
      return;
    }
    setMessage(null);
    createInventory.mutate({
      productId,
      stockLocationId: locationId,
      quantity,
      createdAt: parsedDate.toISOString(),
    });
  };

  return (
    <form className="glass-panel p-4" onSubmit={handleSubmit}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-ink-900">Inventaire {mode === "partial" ? "partiel" : "complet"}</p>
        <div className="flex gap-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode("partial")}
            className={`rounded-full px-3 py-1 ${mode === "partial" ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-700"}`}
          >
            Partiel
          </button>
          <button
            type="button"
            onClick={() => setMode("full")}
            className={`rounded-full px-3 py-1 ${mode === "full" ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-700"}`}
          >
            Complet
          </button>
        </div>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <div className="text-sm text-ink-700">
          Produit
          <button
            type="button"
            onClick={() => setShowProductModal(true)}
            className="mt-1 flex w-full items-center justify-between rounded-lg border border-ink-100 bg-white px-3 py-2 text-left font-semibold text-ink-900"
          >
            {products.find((p) => p.id === productId)?.name ?? "Choisir un produit"}
            <span className="text-xs text-ink-500">Rechercher…</span>
          </button>
        </div>
        <div className="text-sm text-ink-700">
          Emplacement
          <button
            type="button"
            onClick={() => setShowLocationModal(true)}
            className="mt-1 flex w-full items-center justify-between rounded-lg border border-ink-100 bg-white px-3 py-2 text-left font-semibold text-ink-900"
          >
            {locations.find((l) => l.id === locationId)?.name ?? "Choisir un emplacement"}
            <span className="text-xs text-ink-500">Rechercher…</span>
          </button>
        </div>
        <label className="text-sm text-ink-700">
          Quantité constatée
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2"
          />
        </label>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="text-sm text-ink-700">
          Date de l'inventaire
          <input
            type="date"
            value={inventoryDate}
            onChange={(e) => setInventoryDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2"
          />
        </label>
        <label className="text-sm text-ink-700">
          Note
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Cycle count, contrôle réception…"
            className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2"
          />
        </label>
      </div>
      <p className="mt-1 text-[11px] text-ink-500">La note est uniquement visuelle ici.</p>
      <label className="mt-3 block text-sm text-ink-700">
        {message ? <span className="text-xs text-ink-600">{message}</span> : null}
      </label>
      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="submit"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-card"
          disabled={createInventory.isPending || products.length === 0 || locations.length === 0}
        >
          {createInventory.isPending ? "Envoi…" : "Enregistrer l'inventaire"}
        </button>
      </div>
      {showProductModal ? (
        <ModalList
          title="Choisir un produit"
          search={productSearch}
          onSearch={setProductSearch}
          options={productOptions}
          onSelect={(id) => {
            setProductId(id);
            setShowProductModal(false);
          }}
          onClose={() => setShowProductModal(false)}
        />
      ) : null}
      {showLocationModal ? (
        <ModalList
          title="Choisir un emplacement"
          search={locationSearch}
          onSearch={setLocationSearch}
          options={locationOptions}
          onSelect={(id) => {
            setLocationId(id);
            setShowLocationModal(false);
          }}
          onClose={() => setShowLocationModal(false)}
        />
      ) : null}
    </form>
  );
}

export default InventoryEditor;

type Option = { id: number; label: string; hint?: string; isDefault?: boolean };

function ModalList({
  title,
  search,
  onSearch,
  options,
  onSelect,
  onClose,
}: {
  title: string;
  search: string;
  onSearch: (v: string) => void;
  options: Option[];
  onSelect: (id: number) => void;
  onClose: () => void;
}) {
  return createPortal(
    <div
      className="fixed inset-0 z-[3000] flex items-center justify-center bg-ink-900/40 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-white p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-ink-900">{title}</h4>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-ink-100 px-3 py-1 text-xs font-semibold text-ink-700"
          >
            Fermer
          </button>
        </div>
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Recherche"
          className="mt-3 w-full rounded-lg border border-ink-100 px-3 py-2 text-sm"
        />
        <div className="mt-3 max-h-80 space-y-2 overflow-auto">
          {options.length === 0 ? (
            <p className="text-xs text-ink-500">Aucun résultat.</p>
          ) : (
            options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onSelect(opt.id)}
                className="flex w-full items-center justify-between rounded-lg border border-ink-100 bg-white px-3 py-2 text-left text-sm font-semibold text-ink-900 hover:bg-ink-50"
              >
                <span>
                  {opt.label}
                  {opt.hint ? <span className="ml-2 text-xs font-normal text-ink-500">{opt.hint}</span> : null}
                </span>
                {opt.isDefault ? <span className="rounded-full bg-brand-50 px-2 py-1 text-[11px] font-semibold text-brand-700">Défaut</span> : null}
              </button>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
