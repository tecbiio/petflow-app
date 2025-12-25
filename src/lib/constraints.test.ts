import { describe, expect, it } from "vitest";
import { validateProductPayload } from "./constraints";

describe("validateProductPayload", () => {
  it("requires fields when payload is not partial", () => {
    const { errors, payload } = validateProductPayload({});

    expect(errors.length).toBe(8);
    expect(errors).toContain("Nom requis");
    expect(errors).toContain("SKU requis");
    expect(errors).toContain("Prix requis");
    expect(payload.stockThreshold).toBe(0);
  });

  it("accepts partial updates with trimmed values", () => {
    const { errors, payload } = validateProductPayload(
      { name: "  Croquettes  " },
      { partial: true },
    );

    expect(errors).toEqual([]);
    expect(payload.name).toBe("Croquettes");
  });
});
