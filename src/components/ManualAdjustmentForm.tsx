import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { Product, StockLocation } from "../types";

type Props = {
  products: Product[];
  locations: StockLocation[];
};

function ManualAdjustmentForm({ products, locations }: Props) {
  const queryClient = useQueryClient();
  const [productId, setProductId] = useState<number>(products[0]?.id ?? 0);
  const [locationId, setLocationId] = useState<number>(locations[0]?.id ?? 0);
  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState("");
  const [type, setType] = useState<"IN" | "OUT" | "ADJUST">("ADJUST");
  const [message, setMessage] = useState<string | null>(null);

  const createMovement = useMutation({
    mutationFn: api.createStockMovement,
    onSuccess: () => {
      setMessage("Mouvement créé via PUT /stock-movements");
      setQuantity(0);
      setReason("");
      setType("ADJUST");
      queryClient.invalidateQueries({ queryKey: ["movements", productId] });
      queryClient.invalidateQueries({ queryKey: ["stock", productId] });
      queryClient.invalidateQueries({ queryKey: ["stock", productId, "variations"] });
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

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);
    if (!productId || !locationId || quantity === 0) {
      setMessage("Choisissez produit, emplacement et quantité non nulle.");
      return;
    }
    const signedQuantity =
      type === "IN" ? Math.abs(quantity) : type === "OUT" ? -Math.abs(quantity) : quantity;
    createMovement.mutate({
      productId,
      stockLocationId: locationId,
      quantityDelta: signedQuantity,
      reason: reason || type,
      createdAt: new Date().toISOString(),
    });
  };

  return (
    <form className="glass-panel p-4" onSubmit={handleSubmit}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-ink-900">Ajustement manuel</p>
        <span className="pill bg-brand-50 text-brand-700">PUT /stock-movements</span>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
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
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-xs text-ink-500">Payload: productId, stockLocationId, quantityDelta, reason</p>
        <button
          type="submit"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-card"
          disabled={createMovement.isPending || products.length === 0 || locations.length === 0}
        >
          {createMovement.isPending ? "Envoi…" : "Créer le mouvement"}
        </button>
      </div>
      {message ? <p className="mt-2 text-xs text-ink-600">{message}</p> : null}
    </form>
  );
}

export default ManualAdjustmentForm;
