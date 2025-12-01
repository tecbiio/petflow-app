import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { Product, StockLocation } from "../types";

type Props = {
  products: Product[];
  locations: StockLocation[];
};

function InventoryEditor({ products, locations }: Props) {
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [quantity, setQuantity] = useState(0);
  const [note, setNote] = useState("");
  const [mode, setMode] = useState<"partial" | "full">("partial");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      api.createInventory({
        productId,
        stockLocationId: locationId,
        quantity,
        note,
        isPartial: mode === "partial",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock", productId] });
      queryClient.invalidateQueries({ queryKey: ["inventories", productId] });
      setNote("");
    },
  });

  return (
    <div className="glass-panel p-4">
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
        <label className="text-sm text-ink-700">
          Produit
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
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
            onChange={(e) => setLocationId(e.target.value)}
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
      <label className="mt-3 block text-sm text-ink-700">
        Note
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Cycle count, contrôle réception…"
          className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2"
        />
      </label>
      <div className="mt-3 flex items-center justify-end gap-2">
        {mutation.isSuccess ? <p className="text-xs text-emerald-700">Inventaire enregistré</p> : null}
        <button
          type="button"
          onClick={() => mutation.mutate()}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-card"
        >
          Valider l'inventaire
        </button>
      </div>
    </div>
  );
}

export default InventoryEditor;
