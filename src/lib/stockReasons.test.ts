import { describe, expect, it } from "vitest";
import { formatReasonLabel, parseStockMovementReason } from "./stockReasons";

describe("stockReasons", () => {
  it("formats labels for known reasons", () => {
    expect(formatReasonLabel("AVOIR")).toBe("Avoir");
    expect(formatReasonLabel("INCONNU")).toBe("Inconnu");
  });

  it("parses exact reason codes", () => {
    expect(parseStockMovementReason("FACTURE")).toEqual({ code: "FACTURE" });
  });

  it("parses reason with details", () => {
    expect(parseStockMovementReason("PERSO - ajustement")).toEqual({
      code: "PERSO",
      details: "ajustement",
    });
  });

  it("returns null for unknown reason", () => {
    expect(parseStockMovementReason("UNKNOWN")).toEqual({ code: null });
  });
});
