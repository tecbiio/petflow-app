import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "../lib/queryClient";
import { api } from "../api/client";
import { Product, StockLocation } from "../types";
import SelectListModal from "./SelectListModal";

const todayIsoDate = () => new Date().toISOString().slice(0, 10);

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
  const [movementDate, setMovementDate] = useState(todayIsoDate);
  const [message, setMessage] = useState<string | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [locationSearch, setLocationSearch] = useState("");

  const createMovement = useMutation({
    mutationFn: api.createStockMovement,
    onSuccess: () => {
      setMessage("Mouvement créé via PUT /stock-movements");
      setQuantity(0);
      setReason("");
      setType("ADJUST");
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      queryClient.invalidateQueries({ queryKey: ["stock", productId] });
      queryClient.invalidateQueries({ queryKey: ["stock", productId, "variations"] });
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
    setMessage(null);
    if (!productId || !locationId || quantity === 0) {
      setMessage("Choisissez produit, emplacement et quantité non nulle.");
      return;
    }
    const parsedDate = new Date(movementDate);
    if (Number.isNaN(parsedDate.getTime())) {
      setMessage("Date invalide.");
      return;
    }
    const signedQuantity =
      type === "IN" ? Math.abs(quantity) : type === "OUT" ? -Math.abs(quantity) : quantity;
    createMovement.mutate({
      productId,
      stockLocationId: locationId,
      quantityDelta: signedQuantity,
      reason: reason || type,
      createdAt: parsedDate.toISOString(),
    });
  };

  return (
    <form className="panel" onSubmit={handleSubmit}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-ink-900">Ajustement manuel</p>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
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
          Quantité
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="mt-1 input"
          />
        </label>
        <label className="text-sm text-ink-700">
          Nature du mouvement
          <select
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
            className="mt-1 input"
          >
            <option value="IN">Entrée</option>
            <option value="OUT">Sortie</option>
            <option value="ADJUST">Ajustement</option>
          </select>
        </label>
      </div>
      <label className="mt-3 block text-sm text-ink-700">
        Date du mouvement
        <input
          type="date"
          value={movementDate}
          onChange={(e) => setMovementDate(e.target.value)}
          className="mt-1 input"
        />
      </label>
      <label className="mt-3 block text-sm text-ink-700">
        Motif / référence
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Commande client, casse, etc."
          className="mt-1 input"
        />
      </label>
      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={createMovement.isPending || products.length === 0 || locations.length === 0}
        >
          {createMovement.isPending ? "Envoi…" : "Créer le mouvement"}
        </button>
      </div>
      {message ? <p className="mt-2 text-xs text-ink-600">{message}</p> : null}

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

export default ManualAdjustmentForm;
