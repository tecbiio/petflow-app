import {
  DocumentType,
  Inventory,
  ParsedDocumentLine,
  Product,
  StockLocation,
  StockMovement,
  StockSnapshot,
} from "../types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

type ApiProduct = Omit<Product, "price"> & { price: string | number };

type HusseFetchResult = {
  pages: { url: string; html: string }[];
  encounteredLoginPage: boolean;
};

type AxonautLookupResult = Record<string, { id?: string | number; raw?: unknown }>;
type DocumentParseResult = { lines: ParsedDocumentLine[] };

type ActiveFilter = { active?: boolean };

type UpsertProductPayload = {
  name: string;
  sku: string;
  description?: string | null;
  price: number;
  isActive?: boolean;
};

type UpsertLocationPayload = {
  name: string;
  code: string;
  isDefault?: boolean;
  isActive?: boolean;
};

type StockMovementPayload = {
  productId: number;
  stockLocationId: number;
  quantityDelta: number;
  reason?: string;
  createdAt?: string;
};

type InventoryPayload = {
  productId: number;
  stockLocationId: number;
  quantity: number;
  createdAt?: string;
};

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_URL}${path}`;
  const headers: HeadersInit = {
    Accept: "application/json",
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

function mapProduct(product: ApiProduct): Product {
  return {
    ...product,
    price: typeof product.price === "string" ? Number(product.price) : product.price,
  };
}

function queryFrom(filter?: Record<string, unknown>): string {
  const params = new URLSearchParams();
  Object.entries(filter ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      value
        .filter((v) => v !== undefined && v !== null)
        .forEach((v) => params.append(key, String(v)));
    } else {
      params.append(key, String(value));
    }
  });
  const query = params.toString();
  return query ? `?${query}` : "";
}

export const api = {
  listProducts: async (filter?: ActiveFilter): Promise<Product[]> => {
    const data = await fetchJson<ApiProduct[]>(`/products${queryFrom({ active: filter?.active })}`);
    return data.map(mapProduct);
  },

  getProduct: async (productId: number): Promise<Product> => {
    const data = await fetchJson<ApiProduct>(`/products/${productId}`);
    return mapProduct(data);
  },

  createProduct: async (payload: UpsertProductPayload): Promise<Product> => {
    const data = await fetchJson<ApiProduct>("/products", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return mapProduct(data);
  },

  updateProduct: async (productId: number, payload: Partial<UpsertProductPayload>): Promise<Product> => {
    const data = await fetchJson<ApiProduct>(`/products/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return mapProduct(data);
  },

  listStockLocations: (filter?: ActiveFilter): Promise<StockLocation[]> =>
    fetchJson(`/stock-locations${queryFrom({ active: filter?.active })}`),

  createStockLocation: (payload: UpsertLocationPayload): Promise<StockLocation> =>
    fetchJson("/stock-locations", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  updateStockLocation: (
    stockLocationId: number,
    payload: Partial<UpsertLocationPayload>,
  ): Promise<StockLocation> =>
    fetchJson(`/stock-locations/${stockLocationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  getDefaultStockLocation: (): Promise<StockLocation> => fetchJson("/stock-locations/default"),

  getStockForProduct: (productId: number): Promise<StockSnapshot> => fetchJson(`/stock/${productId}`),

  getStockAtDate: (productId: number, dateIso: string): Promise<StockSnapshot> =>
    fetchJson(`/stock/${productId}/at/${dateIso}`),

  getStockVariations: (productId: number): Promise<StockMovement[]> =>
    fetchJson(`/stock/${productId}/variations`),

  getMovementsByProduct: (productId: number): Promise<StockMovement[]> =>
    fetchJson(`/stock-movements/product/${productId}`),

  getMovementsByStockLocation: (stockLocationId: number): Promise<StockMovement[]> =>
    fetchJson(`/stock-movements/stock-location/${stockLocationId}`),

  getMovementsByDate: (dateIso: string): Promise<StockMovement[]> =>
    fetchJson(`/stock-movements/date/${dateIso}`),

  createStockMovement: (payload: StockMovementPayload): Promise<StockMovement> =>
    fetchJson("/stock-movements", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  createStockMovements: (payloads: StockMovementPayload[]): Promise<{ created: number; movements: StockMovement[] }> =>
    fetchJson("/stock-movements/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloads),
    }),

  listStockMovements: (filter?: { productId?: number; reasons?: string[] }): Promise<StockMovement[]> =>
    fetchJson(`/stock-movements${queryFrom({ productId: filter?.productId, reason: filter?.reasons })}`),

  getInventoriesByProduct: (productId: number): Promise<Inventory[]> =>
    fetchJson(`/inventories/product/${productId}`),

  getInventoriesByStockLocation: (stockLocationId: number): Promise<Inventory[]> =>
    fetchJson(`/inventories/stock-location/${stockLocationId}`),

  getInventoriesByDate: (dateIso: string): Promise<Inventory[]> =>
    fetchJson(`/inventories/date/${dateIso}`),

  listInventories: (filter?: { productId?: number }): Promise<Inventory[]> =>
    fetchJson(`/inventories${queryFrom({ productId: filter?.productId })}`),

  createInventory: (payload: InventoryPayload): Promise<Inventory> =>
    fetchJson("/inventories", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  husseLogin: (baseUrl: string, username: string, password: string): Promise<{ ok: boolean }> =>
    fetchJson("/husse/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ baseUrl, username, password }),
    }),

  husseSession: (): Promise<{ hasCookie: boolean }> => fetchJson("/husse/session"),

  husseFetch: (urls: string[]): Promise<HusseFetchResult> =>
    fetchJson("/husse/fetch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls }),
    }),

  axonautSetConfig: (payload: {
    apiKey: string;
    baseUrl?: string;
    updateStockUrlTemplate?: string;
    lookupProductsUrlTemplate?: string;
    husseUsername?: string;
    hussePassword?: string;
  }): Promise<{ ok: boolean }> =>
    fetchJson("/axonaut/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  axonautUpdateStock: (payload: {
    productId: string;
    quantityDelta?: number;
    quantity?: number;
    reason?: string;
  }): Promise<{ ok: boolean }> =>
    fetchJson("/axonaut/update-stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  axonautGetConfig: (): Promise<{
    apiKey: string;
    baseUrl?: string;
    updateStockUrlTemplate?: string;
    lookupProductsUrlTemplate?: string;
    husseUsername?: string;
    hussePassword?: string;
  } | null> => fetchJson("/axonaut/config"),

  axonautLookup: (references: string[]): Promise<AxonautLookupResult> =>
    fetchJson("/axonaut/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ references }),
    }),

  axonautTestRequest: (payload: { url?: string; path?: string; method?: "GET" | "POST" | "PATCH"; body?: unknown }): Promise<{
    ok: boolean;
    status: number;
    statusText: string;
    url: string;
    body: unknown;
  }> =>
    fetchJson("/axonaut/test-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  parseDocument: (file: File, docType: DocumentType): Promise<DocumentParseResult> => {
    const form = new FormData();
    form.append("file", file);
    form.append("docType", docType);
    return fetchJson("/documents/parse", {
      method: "POST",
      body: form,
    });
  },

  ingestDocument: (payload: {
    docType: DocumentType;
    stockLocationId?: number;
    sourceDocumentId?: string;
    lines: ParsedDocumentLine[];
  }): Promise<{
    created: number;
    skipped: { reference: string; reason: string }[];
    productsCreated?: number;
    productsLinked?: number;
  }> =>
    fetchJson("/documents/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
};
