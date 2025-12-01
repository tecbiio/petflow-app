import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { Product, StockLocation } from "../types";

type Props = {
  products: Product[];
  locations: StockLocation[];
};

function ManualAdjustmentForm({ products, locations }: Props) {
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState("");
  const [type, setType] = useState<"IN" | "OUT" | "ADJUST">("ADJUST");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      api.createStockMovement({
        productId,
        stockLocationId: locationId,
        quantity: type === "OUT" ? -Math.abs(quantity) : Math.abs(quantity),
        reason,
        type,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock", productId] });
      queryClient.invalidateQueries({ queryKey: ["movements", productId] });
      setReason("");
      setQuantity(0);
    },
  });

  return (
    <div className="glass-panel p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-ink-900">Ajustement manuel</p>
        <span className="pill bg-ink-100 text-ink-700">IN / OUT / Ajustement</span>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
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
          Quantité
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2"
          />
        </label>
        <label className="text-sm text-ink-700">
          Nature du mouvement
          <select
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
            className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2"
          >
            <option value="IN">Entrée</option>
            <option value="OUT">Sortie</option>
            <option value="ADJUST">Ajustement</option>
          </select>
        </label>
      </div>
      <label className="mt-3 block text-sm text-ink-700">
        Motif / référence
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Commande client, casse, etc."
          className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2"
        />
      </label>
      <div className="mt-3 flex items-center justify-end gap-2">
        {mutation.isSuccess ? <p className="text-xs text-emerald-700">Enregistré</p> : null}
        <button
          type="button"
          onClick={() => mutation.mutate()}
          className="rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-card"
        >
          Valider
        </button>
      </div>
    </div>
  );
}

export default ManualAdjustmentForm;
