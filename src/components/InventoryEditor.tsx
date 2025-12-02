import { FormEvent, useEffect, useMemo, useState } from "react";
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
    if (products[0]?.id) {
      setProductId(products[0].id);
    }
  }, [products]);

  useEffect(() => {
    if (locations[0]?.id) {
      setLocationId(locations[0].id);
    }
  }, [locations]);

  const parsedDate = useMemo(() => new Date(inventoryDate), [inventoryDate]);

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
      <p className="mt-2 text-xs text-ink-600">Appelle PUT /inventories (payload: productId, stockLocationId, quantity).</p>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <label className="text-sm text-ink-700">
          Produit
          <select
            value={productId}
            onChange={(e) => setProductId(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-ink-700">
          Emplacement
          <select
            value={locationId}
            onChange={(e) => setLocationId(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2"
          >
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
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
    </form>
  );
}

export default InventoryEditor;
