import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "../lib/queryClient";
import { api } from "../api/client";
import { Product, StockLocation } from "../types";
import SelectListModal from "./SelectListModal";

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
        .map((p) => ({ id: p.id, label: p.name, hint: p.sku })),
    [products],
  );
  const locationOptions = useMemo(
    () =>
      locations
        .map((l) => ({ id: l.id, label: l.name, hint: l.code, isDefault: l.isDefault })),
    [locations],
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
    <form className="panel" onSubmit={handleSubmit}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-ink-900">Inventaire {mode === "partial" ? "partiel" : "complet"}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode("partial")}
            className={["btn btn-xs rounded-full", mode === "partial" ? "btn-primary" : "btn-muted"].join(" ")}
            disabled={createInventory.isPending}
          >
            Partiel
          </button>
          <button
            type="button"
            onClick={() => setMode("full")}
            className={["btn btn-xs rounded-full", mode === "full" ? "btn-primary" : "btn-muted"].join(" ")}
            disabled={createInventory.isPending}
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
            onClick={() => {
              setProductSearch("");
              setShowProductModal(true);
            }}
            className="mt-1 input flex items-center justify-between text-left font-semibold text-ink-900"
          >
            {products.find((p) => p.id === productId)?.name ?? "Choisir un produit"}
            <span className="text-xs text-ink-500">Rechercher…</span>
          </button>
        </div>
        <div className="text-sm text-ink-700">
          Emplacement
          <button
            type="button"
            onClick={() => {
              setLocationSearch("");
              setShowLocationModal(true);
            }}
            className="mt-1 input flex items-center justify-between text-left font-semibold text-ink-900"
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
            className="mt-1 input"
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
            className="mt-1 input"
          />
        </label>
        <label className="text-sm text-ink-700">
          Note
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Cycle count, contrôle réception…"
            className="mt-1 input"
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
          className="btn btn-primary"
          disabled={createInventory.isPending || products.length === 0 || locations.length === 0}
        >
          {createInventory.isPending ? "Envoi…" : "Enregistrer l'inventaire"}
        </button>
      </div>
      {showProductModal ? (
        <SelectListModal
          open={showProductModal}
          onOpenChange={setShowProductModal}
          title="Choisir un produit"
          search={productSearch}
          onSearch={setProductSearch}
          options={productOptions}
          selectedId={productId}
          onSelect={(id) => {
            setProductId(id);
            setProductSearch("");
          }}
        />
      ) : null}
      {showLocationModal ? (
        <SelectListModal
          open={showLocationModal}
          onOpenChange={setShowLocationModal}
          title="Choisir un emplacement"
          search={locationSearch}
          onSearch={setLocationSearch}
          options={locationOptions}
          selectedId={locationId}
          onSelect={(id) => {
            setLocationId(id);
            setLocationSearch("");
          }}
        />
      ) : null}
    </form>
  );
}

export default InventoryEditor;
