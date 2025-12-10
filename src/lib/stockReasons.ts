export const STOCK_MOVEMENT_REASONS = ["FACTURE", "AVOIR", "PERTE", "CASSE", "DON"] as const;

export type StockMovementReason = (typeof STOCK_MOVEMENT_REASONS)[number];

export function formatReasonLabel(reason: StockMovementReason) {
  const lower = reason.replace(/_/g, " ").toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
