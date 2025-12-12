import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { Inventory, Product, StockLocation, StockMovement } from "../types";
import { STOCK_MOVEMENT_REASONS, StockMovementReason, formatReasonLabel } from "../lib/stockReasons";
import SearchSelect, { SelectOption } from "./SearchSelect";
import Modal from "./ui/Modal";

const todayIsoDate = () => new Date().toISOString().slice(0, 10);

type Props = {
  products: Product[];
  locations: StockLocation[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
  triggerLabel?: string;
  triggerClassName?: string;
  triggerDisabled?: boolean;
  modes?: Array<"movement" | "inventory">;
  defaultProductId?: number;
  defaultLocationId?: number;
  subtitle?: string;
  initialMode?: "movement" | "inventory";
  onCreated?: (payload: { kind: "movement"; movement: StockMovement } | { kind: "inventory"; inventory: Inventory }) => void;
};

function MovementInventoryModal({
  open,
  onOpenChange,
  products,
  locations,
  showTrigger = false,
  triggerLabel = "Nouveau mouvement / inventaire",
  triggerClassName = "rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-card",
  triggerDisabled,
  modes,
  defaultProductId,
  defaultLocationId,
  subtitle,
  initialMode,
  onCreated,
}: Props) {
  const queryClient = useQueryClient();
  const allowedModes: Array<"movement" | "inventory"> = modes && modes.length > 0 ? modes : ["movement", "inventory"];
  const initialModeResolved = initialMode ?? allowedModes[0];
  const isControlled = typeof open === "boolean";
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = isControlled ? Boolean(open) : internalOpen;
  const setOpen = (next: boolean) => {
    if (isControlled) {
      onOpenChange?.(next);
    } else {
      setInternalOpen(next);
      onOpenChange?.(next);
    }
  };

  const [entryMode, setEntryMode] = useState<"movement" | "inventory">(initialModeResolved);
  const [movementProductId, setMovementProductId] = useState<number | undefined>(defaultProductId);
  const [movementLocationId, setMovementLocationId] = useState<number | undefined>(defaultLocationId);
  const [movementProductSearch, setMovementProductSearch] = useState("");
  const [movementLocationSearch, setMovementLocationSearch] = useState("");
  const [movementReasonSearch, setMovementReasonSearch] = useState("");
  const [entryQuantity, setEntryQuantity] = useState(0);
  const [movementType, setMovementType] = useState<"IN" | "OUT">("IN");
  const [movementReason, setMovementReason] = useState<StockMovementReason>(STOCK_MOVEMENT_REASONS[0]);
  const [movementReference, setMovementReference] = useState("");
  const [entryDate, setEntryDate] = useState(todayIsoDate());
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const movementProductOptions: SelectOption[] = useMemo(
    () =>
      products
        .filter(
          (p) =>
            p.name.toLowerCase().includes(movementProductSearch.toLowerCase()) ||
            p.sku.toLowerCase().includes(movementProductSearch.toLowerCase()),
        )
        .slice(0, 10)
        .map((p) => ({ id: p.id, label: p.name, hint: p.sku })),
    [products, movementProductSearch],
  );

  const movementLocationOptions: SelectOption[] = useMemo(
    () =>
      locations
        .filter(
          (l) =>
            l.name.toLowerCase().includes(movementLocationSearch.toLowerCase()) ||
            l.code.toLowerCase().includes(movementLocationSearch.toLowerCase()),
        )
        .slice(0, 10)
        .map((l) => ({ id: l.id, label: l.name, hint: l.code })),
    [locations, movementLocationSearch],
  );

  const movementReasonOptions: SelectOption[] = useMemo(
    () =>
      STOCK_MOVEMENT_REASONS.map((reason) => ({
        id: reason,
        label: formatReasonLabel(reason),
      })).filter((opt) => opt.label.toLowerCase().includes(movementReasonSearch.toLowerCase())),
    [movementReasonSearch],
  );

  const resetForm = () => {
    const defaultProduct = defaultProductId ?? undefined;
    const defaultLocation = defaultLocationId ?? locations.find((l) => l.isDefault)?.id ?? locations[0]?.id;
    setEntryMode(initialModeResolved);
    setMovementProductId(defaultProduct);
    setMovementLocationId(defaultLocation);
    setMovementProductSearch(defaultProduct ? products.find((p) => p.id === defaultProduct)?.name ?? "" : "");
    setMovementLocationSearch(defaultLocation ? locations.find((l) => l.id === defaultLocation)?.name ?? "" : "");
    setMovementReasonSearch(formatReasonLabel(STOCK_MOVEMENT_REASONS[0]));
    setEntryQuantity(0);
    setMovementType("IN");
    setMovementReason(STOCK_MOVEMENT_REASONS[0]);
    setMovementReference("");
    setEntryDate(todayIsoDate());
    setFormMessage(null);
  };

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialModeResolved, defaultProductId, defaultLocationId, products, locations]);

  const createMovement = useMutation({
    mutationFn: api.createStockMovement,
    onSuccess: (movement: StockMovement) => {
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      queryClient.invalidateQueries({ queryKey: ["stock", movement.productId] });
      queryClient.invalidateQueries({ queryKey: ["inventories"] });
      onCreated?.({ kind: "movement", movement });
      setOpen(false);
    },
    onError: (error: Error) => setFormMessage(error.message),
  });

  const createInventory = useMutation({
    mutationFn: api.createInventory,
    onSuccess: (inventory: Inventory) => {
      queryClient.invalidateQueries({ queryKey: ["inventories"] });
      queryClient.invalidateQueries({ queryKey: ["stock", inventory.productId] });
      onCreated?.({ kind: "inventory", inventory });
      setOpen(false);
    },
    onError: (error: Error) => setFormMessage(error.message),
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setFormMessage(null);
    if (!movementProductId || !movementLocationId) {
      setFormMessage("Sélectionne un produit et un emplacement.");
      return;
    }
    if (!Number.isFinite(entryQuantity)) {
      setFormMessage("Quantité requise.");
      return;
    }
    if (entryQuantity < 0) {
      setFormMessage("La quantité ne peut pas être négative.");
      return;
    }
    if (entryMode === "movement" && entryQuantity === 0) {
      setFormMessage("Quantité non nulle requise.");
      return;
    }
    const parsedDate = new Date(entryDate);
    if (Number.isNaN(parsedDate.getTime())) {
      setFormMessage("Date invalide.");
      return;
    }
    if (entryMode === "movement") {
      const signed = movementType === "IN" ? Math.abs(entryQuantity) : -Math.abs(entryQuantity);
      const reasonLabel = movementReference.trim()
        ? `${movementReason} - ${movementReference.trim()}`
        : movementReason;
      createMovement.mutate({
        productId: movementProductId,
        stockLocationId: movementLocationId,
        quantityDelta: signed,
        reason: reasonLabel,
        createdAt: parsedDate.toISOString(),
      });
    } else {
      createInventory.mutate({
        productId: movementProductId,
        stockLocationId: movementLocationId,
        quantity: entryQuantity,
        createdAt: parsedDate.toISOString(),
      });
    }
  };

  const triggerButton =
    showTrigger && !isControlled ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={triggerClassName}
        disabled={triggerDisabled ?? (products.length === 0 || locations.length === 0)}
      >
        {triggerLabel}
      </button>
    ) : null;

  if (!isOpen && !triggerButton) return null;

  const isBusy = createMovement.isPending || createInventory.isPending;

  const modalContent = (
    <Modal
      open={isOpen}
      onOpenChange={setOpen}
      title={entryMode === "movement" ? "Créer un mouvement" : "Inventaire partiel"}
      description={subtitle ?? "Saisie rapide"}
      size="lg"
      canClose={!isBusy}
    >
      {allowedModes.length > 1 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setEntryMode("movement")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                entryMode === "movement"
                  ? "bg-ink-900 text-white shadow-card"
                  : "bg-ink-100 text-ink-700 hover:bg-ink-200"
              }`}
            >
              Mouvement
            </button>
            <button
              type="button"
              onClick={() => setEntryMode("inventory")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                entryMode === "inventory"
                  ? "bg-ink-900 text-white shadow-card"
                  : "bg-ink-100 text-ink-700 hover:bg-ink-200"
              }`}
            >
              Inventaire partiel
            </button>
          </div>
        ) : null}

        <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
          <div className="grid gap-3 md:grid-cols-2">
            <SearchSelect
              label="Produit"
              placeholder="Rechercher un produit"
              valueId={movementProductId}
              search={movementProductSearch}
              onSearch={setMovementProductSearch}
              options={movementProductOptions}
              onSelect={(opt) => {
                if (opt) {
                  setMovementProductId(opt.id as number);
                  setMovementProductSearch(opt.label);
                }
              }}
              allowClear={false}
            />
            <SearchSelect
              label="Emplacement"
              placeholder="Rechercher un emplacement"
              valueId={movementLocationId}
              search={movementLocationSearch}
              onSearch={setMovementLocationSearch}
              options={movementLocationOptions}
              onSelect={(opt) => {
                if (opt) {
                  setMovementLocationId(opt.id as number);
                  setMovementLocationSearch(opt.label);
                }
              }}
              allowClear={false}
            />
          </div>

          <div
            className={`grid gap-3 ${
              entryMode === "movement" ? "md:grid-cols-3" : "md:grid-cols-2"
            }`}
          >
            <label className="text-sm text-ink-700">
              Quantité
              <input
                type="number"
                min={0}
                value={entryQuantity}
                onChange={(e) => setEntryQuantity(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2"
              />
            </label>

            {entryMode === "movement" ? (
              <div className="text-sm text-ink-700">
                Sens
                <div className="mt-1 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMovementType("IN")}
                    className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                      movementType === "IN"
                        ? "bg-ink-900 text-white shadow-card"
                        : "bg-ink-100 text-ink-700 hover:bg-ink-200"
                    }`}
                  >
                    Entrée
                  </button>
                  <button
                    type="button"
                    onClick={() => setMovementType("OUT")}
                    className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                      movementType === "OUT"
                        ? "bg-ink-900 text-white shadow-card"
                        : "bg-ink-100 text-ink-700 hover:bg-ink-200"
                    }`}
                  >
                    Sortie
                  </button>
                </div>
              </div>
            ) : null}

            <label className="text-sm text-ink-700">
              {entryMode === "movement" ? "Date du mouvement" : "Date de l'inventaire"}
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2"
              />
            </label>
          </div>

          {entryMode === "movement" ? (
            <div className="grid gap-3 md:grid-cols-2">
              <SearchSelect
                label="Motif (stock-reason)"
                placeholder="Rechercher un motif"
                valueId={movementReason}
                search={movementReasonSearch}
                onSearch={setMovementReasonSearch}
                options={movementReasonOptions}
                onSelect={(opt) => {
                  if (opt) {
                    setMovementReason(opt.id as StockMovementReason);
                    setMovementReasonSearch(opt.label);
                  }
                }}
                allowClear={false}
              />
              <label className="text-sm text-ink-700">
                Référence (optionnel)
                <input
                  type="text"
                  value={movementReference}
                  onChange={(e) => setMovementReference(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2"
                  placeholder="N° commande, détail..."
                />
              </label>
            </div>
          ) : null}

          <div className="flex items-center justify-between">
            {formMessage ? <p className="text-xs text-amber-700">{formMessage}</p> : <span />}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg bg-ink-100 px-4 py-2 text-sm font-semibold text-ink-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isBusy}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-card"
                disabled={isBusy || products.length === 0 || locations.length === 0}
              >
                {isBusy ? "Envoi…" : "Créer"}
              </button>
            </div>
          </div>
        </form>
    </Modal>
  );

  return (
    <>
      {triggerButton}
      {modalContent}
    </>
  );
}

export default MovementInventoryModal;
