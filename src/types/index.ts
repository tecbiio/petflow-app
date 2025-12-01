export type Product = {
  id: string;
  name: string;
  sku?: string;
  description?: string;
  threshold?: number;
  unit?: string;
  tags?: string[];
};

export type StockLocation = {
  id: string;
  name: string;
  code?: string;
  isDefault?: boolean;
  address?: string;
  note?: string;
};

export type StockMovement = {
  id: string;
  productId: string;
  stockLocationId: string;
  quantity: number;
  type?: "IN" | "OUT" | "ADJUST";
  reason?: string;
  createdAt: string;
  reference?: string;
};

export type Inventory = {
  id: string;
  productId: string;
  stockLocationId: string;
  quantity: number;
  createdAt: string;
  note?: string;
};

export type StockSnapshot = {
  productId: string;
  quantity: number;
  at?: string;
};

export type StockVariation = {
  id: string;
  productId: string;
  quantity: number;
  createdAt: string;
  stockLocationId?: string;
  reason?: string;
};
