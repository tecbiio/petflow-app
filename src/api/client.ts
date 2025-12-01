import { Inventory, Product, StockLocation, StockMovement, StockSnapshot } from "../types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

type ApiProduct = Omit<Product, "price"> & { price: string | number };

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

export const api = {
  listProducts: async (): Promise<Product[]> => {
    const data = await fetchJson<ApiProduct[]>("/products");
    return data.map(mapProduct);
  },

  getProduct: async (productId: number): Promise<Product> => {
    const data = await fetchJson<ApiProduct>(`/products/${productId}`);
    return mapProduct(data);
  },

  listStockLocations: (): Promise<StockLocation[]> => fetchJson("/stock-locations"),

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

  getInventoriesByProduct: (productId: number): Promise<Inventory[]> =>
    fetchJson(`/inventories/product/${productId}`),
};
