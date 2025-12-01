import { useEffect, useState } from "react";
import { Product, StockLocation } from "../types";

type Props = {
  products: Product[];
  locations: StockLocation[];
};

function ManualAdjustmentForm({ products, locations }: Props) {
  const [productId, setProductId] = useState<number>(products[0]?.id ?? 0);
  const [locationId, setLocationId] = useState<number>(locations[0]?.id ?? 0);
  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState("");
  const [type, setType] = useState<"IN" | "OUT" | "ADJUST">("ADJUST");
  const writesDisabled = true;

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

  return (
    <div className="glass-panel p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-ink-900">Ajustement manuel</p>
        <span className="pill bg-ink-100 text-ink-700">Lecture seule API</span>
      </div>
      <p className="mt-2 text-xs text-ink-600">
        Les endpoints POST pour créer des mouvements ne sont pas encore exposés côté core. Le formulaire reste présent pour préparer l'UX mais les actions sont désactivées.
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="text-sm text-ink-700">
          Produit
          <select
            value={productId}
            onChange={(e) => setProductId(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2"
            disabled={writesDisabled}
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
            disabled={writesDisabled}
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
            disabled={writesDisabled}
          />
        </label>
        <label className="text-sm text-ink-700">
          Nature du mouvement
          <select
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
            className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2"
            disabled={writesDisabled}
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
          disabled={writesDisabled}
        />
      </label>
      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          disabled
          className="rounded-lg bg-ink-300 px-4 py-2 text-sm font-semibold text-white opacity-70"
        >
          En attente côté API
        </button>
      </div>
    </div>
  );
}

export default ManualAdjustmentForm;
