export const STOCK_MOVEMENT_REASONS = ["FACTURE", "AVOIR", "PERSO", "POUBELLE", "DON", "INCONNU"] as const;

export type StockMovementReason = (typeof STOCK_MOVEMENT_REASONS)[number];

export const DEFAULT_STOCK_MOVEMENT_REASON: StockMovementReason = "PERSO";

export const STOCK_MOVEMENT_REASON_LABELS: Record<StockMovementReason, string> = {
  FACTURE: "Facture",
  AVOIR: "Avoir",
  PERSO: "Perso",
  POUBELLE: "Poubelle",
  DON: "Don",
  INCONNU: "Inconnu",
};

export function formatReasonLabel(reason: StockMovementReason) {
  return STOCK_MOVEMENT_REASON_LABELS[reason] ?? reason;
}

export function parseStockMovementReason(raw: string): { code: StockMovementReason | null; details?: string } {
  const value = String(raw ?? "").trim();
  if (!value) return { code: null };

  const exact = STOCK_MOVEMENT_REASONS.find((reason) => reason === value);
  if (exact) return { code: exact };

  for (const reason of STOCK_MOVEMENT_REASONS) {
    const prefix = `${reason} -`;
    if (value.startsWith(prefix)) {
      const details = value.slice(prefix.length).trim();
      return { code: reason, ...(details ? { details } : {}) };
    }
  }

  return { code: null };
}
