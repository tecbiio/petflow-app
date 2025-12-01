import { useEffect, useState } from "react";
import { Product, StockLocation } from "../types";

type Props = {
  products: Product[];
  locations: StockLocation[];
};

function InventoryEditor({ products, locations }: Props) {
  const [productId, setProductId] = useState<number>(products[0]?.id ?? 0);
  const [locationId, setLocationId] = useState<number>(locations[0]?.id ?? 0);
  const [quantity, setQuantity] = useState(0);
  const [note, setNote] = useState("");
  const [mode, setMode] = useState<"partial" | "full">("partial");
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
        <p className="text-sm font-semibold text-ink-900">Inventaire {mode === "partial" ? "partiel" : "complet"}</p>
        <div className="flex gap-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode("partial")}
            className={`rounded-full px-3 py-1 ${mode === "partial" ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-700"}`}
            disabled={writesDisabled}
          >
            Partiel
          </button>
          <button
            type="button"
            onClick={() => setMode("full")}
            className={`rounded-full px-3 py-1 ${mode === "full" ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-700"}`}
            disabled={writesDisabled}
          >
            Complet
          </button>
        </div>
      </div>
      <p className="mt-2 text-xs text-ink-600">
        La création d'inventaires n'est pas encore branchée côté API. Les contrôles restent visibles pour préparer le flux.
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
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
          Quantité constatée
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2"
            disabled={writesDisabled}
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

export default InventoryEditor;
