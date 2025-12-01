import { Inventory, Product, StockLocation, StockMovement, StockSnapshot, StockVariation } from "../types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === "true";

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_URL}${path}`;
  const headers: HeadersInit =
    options?.body instanceof FormData
      ? { ...(options?.headers ?? {}) }
      : {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(options?.headers ?? {}),
        };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API ${response.status}: ${text || response.statusText}`);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  listProducts: (): Promise<Product[]> =>
    USE_MOCKS ? Promise.resolve(mockData.products) : fetchJson("/products"),

  getProduct: (productId: string): Promise<Product> =>
    USE_MOCKS
      ? Promise.resolve(mockData.products.find((p) => p.id === productId) ?? mockData.products[0])
      : fetchJson(`/products/${productId}`),

  listStockLocations: (): Promise<StockLocation[]> =>
    USE_MOCKS ? Promise.resolve(mockData.stockLocations) : fetchJson("/stock-locations"),

  getDefaultStockLocation: (): Promise<StockLocation> =>
    USE_MOCKS
      ? Promise.resolve(mockData.stockLocations.find((l) => l.isDefault) ?? mockData.stockLocations[0])
      : fetchJson("/stock-locations/default"),

  createStockLocation: (payload: { name: string; code?: string; address?: string; note?: string }): Promise<StockLocation> => {
    if (USE_MOCKS) {
      const created: StockLocation = { id: crypto.randomUUID(), isDefault: false, ...payload };
      mockData.stockLocations.push(created);
      return Promise.resolve(created);
    }

    return fetchJson(`/stock-locations`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  setDefaultStockLocation: (stockLocationId: string): Promise<StockLocation> => {
    if (USE_MOCKS) {
      mockData.stockLocations = mockData.stockLocations.map((loc) => ({
        ...loc,
        isDefault: loc.id === stockLocationId,
      }));
      return Promise.resolve(mockData.stockLocations.find((l) => l.id === stockLocationId) as StockLocation);
    }

    return fetchJson(`/stock-locations/${stockLocationId}`, {
      method: "PATCH",
      body: JSON.stringify({ isDefault: true }),
    });
  },

  getStockForProduct: (productId: string): Promise<StockSnapshot> =>
    USE_MOCKS
      ? Promise.resolve({ productId, quantity: mockData.stockByProduct[productId] ?? 0 })
      : fetchJson(`/stock/${productId}`),

  getStockAtDate: (productId: string, dateIso: string): Promise<StockSnapshot> =>
    USE_MOCKS
      ? Promise.resolve({ productId, quantity: mockData.stockByProduct[productId] ?? 0, at: dateIso })
      : fetchJson(`/stock/${productId}/at/${dateIso}`),

  getStockVariations: (productId: string): Promise<StockVariation[]> =>
    USE_MOCKS ? Promise.resolve(mockData.variations[productId] ?? []) : fetchJson(`/stock/${productId}/variations`),

  getMovementsByProduct: (productId: string): Promise<StockMovement[]> =>
    USE_MOCKS
      ? Promise.resolve(mockData.movements.filter((m) => m.productId === productId))
      : fetchJson(`/stock-movements/product/${productId}`),

  getMovementsByStockLocation: (stockLocationId: string): Promise<StockMovement[]> =>
    USE_MOCKS
      ? Promise.resolve(mockData.movements.filter((m) => m.stockLocationId === stockLocationId))
      : fetchJson(`/stock-movements/stock-location/${stockLocationId}`),

  getInventoriesByProduct: (productId: string): Promise<Inventory[]> =>
    USE_MOCKS
      ? Promise.resolve(mockData.inventories.filter((i) => i.productId === productId))
      : fetchJson(`/inventories/product/${productId}`),

  createStockMovement: (payload: {
    productId: string;
    stockLocationId: string;
    quantity: number;
    type?: string;
    reason?: string;
    reference?: string;
    document?: File | null;
  }): Promise<StockMovement> => {
    if (USE_MOCKS) {
      const newMovement: StockMovement = {
        id: crypto.randomUUID(),
        productId: payload.productId,
        stockLocationId: payload.stockLocationId,
        quantity: payload.quantity,
        reason: payload.reason,
        type: (payload.type as StockMovement["type"]) ?? "ADJUST",
        createdAt: new Date().toISOString(),
        reference: payload.reference,
      };
      mockData.movements.unshift(newMovement);
      mockData.stockByProduct[payload.productId] =
        (mockData.stockByProduct[payload.productId] ?? 0) + payload.quantity;
      return Promise.resolve(newMovement);
    }

    if (payload.document) {
      const formData = new FormData();
      formData.append("productId", payload.productId);
      formData.append("stockLocationId", payload.stockLocationId);
      formData.append("quantity", payload.quantity.toString());
      if (payload.type) formData.append("type", payload.type);
      if (payload.reason) formData.append("reason", payload.reason);
      if (payload.reference) formData.append("reference", payload.reference);
      formData.append("document", payload.document);
      return fetchJson(`/stock-movements`, { method: "POST", body: formData });
    }

    return fetchJson(`/stock-movements`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  createInventory: (payload: {
    productId: string;
    stockLocationId: string;
    quantity: number;
    date?: string;
    note?: string;
    isPartial?: boolean;
  }): Promise<Inventory> => {
    if (USE_MOCKS) {
      const inventory: Inventory = {
        id: crypto.randomUUID(),
        productId: payload.productId,
        stockLocationId: payload.stockLocationId,
        quantity: payload.quantity,
        createdAt: payload.date ?? new Date().toISOString(),
        note: payload.note,
      };
      mockData.inventories.unshift(inventory);
      mockData.stockByProduct[payload.productId] = payload.quantity;
      return Promise.resolve(inventory);
    }

    return fetchJson(`/inventories`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};

const mockData: {
  products: Product[];
  stockLocations: StockLocation[];
  movements: StockMovement[];
  inventories: Inventory[];
  stockByProduct: Record<string, number>;
  variations: Record<string, StockVariation[]>;
} = {
  products: [
    {
      id: "p1",
      name: "Croquettes chien adulte",
      sku: "DOG-AD-15KG",
      description: "Formule riche en protéines pour chiens actifs.",
      unit: "sac",
      threshold: 12,
      tags: ["aliment", "chien"],
    },
    {
      id: "p2",
      name: "Litière minérale",
      sku: "CAT-LITTER-10",
      description: "Litière minérale à haute absorption.",
      unit: "sac",
      threshold: 20,
      tags: ["chat", "consommable"],
    },
    {
      id: "p3",
      name: "Gamelle inox",
      sku: "BOWL-INOX-1L",
      description: "Bol inox antidérapant.",
      unit: "pièce",
      threshold: 8,
      tags: ["accessoire"],
    },
  ],
  stockLocations: [
    { id: "s1", name: "Entrepôt principal", code: "MAIN", isDefault: true },
    { id: "s2", name: "Magasin Lyon", code: "LYN" },
    { id: "s3", name: "Corner Paris", code: "PAR" },
  ],
  movements: [
    {
      id: "m1",
      productId: "p1",
      stockLocationId: "s1",
      quantity: 10,
      type: "IN",
      reason: "Réassort fournisseur",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      reference: "CMD-2489",
    },
    {
      id: "m2",
      productId: "p1",
      stockLocationId: "s2",
      quantity: -2,
      type: "OUT",
      reason: "Vente boutique",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
    },
    {
      id: "m3",
      productId: "p2",
      stockLocationId: "s1",
      quantity: -5,
      type: "OUT",
      reason: "Commande web",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    },
  ],
  inventories: [
    {
      id: "inv1",
      productId: "p1",
      stockLocationId: "s1",
      quantity: 14,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
      note: "Inventaire hebdo",
    },
  ],
  stockByProduct: {
    p1: 18,
    p2: 30,
    p3: 7,
  },
  variations: {
    p1: [
      {
        id: "v1",
        productId: "p1",
        quantity: -2,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
        stockLocationId: "s2",
        reason: "Vente boutique",
      },
      {
        id: "v2",
        productId: "p1",
        quantity: 10,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
        stockLocationId: "s1",
        reason: "Réception fournisseur",
      },
    ],
  },
};
