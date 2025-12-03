export type Product = {
  id: number;
  name: string;
  sku: string;
  description: string | null;
  price: number;
  isActive?: boolean;
  axonautProductId?: number | null;
  createdAt: string;
  updatedAt: string;
};

export type StockLocation = {
  id: number;
  name: string;
  code: string;
  isDefault: boolean;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type StockMovement = {
  id: number;
  productId: number;
  stockLocationId: number;
  quantityDelta: number;
  reason: string;
  createdAt: string;
};

export type Inventory = {
  id: number;
  productId: number;
  stockLocationId: number;
  quantity: number;
  createdAt: string;
  updatedAt: string;
};

export type StockSnapshot = {
  stock: number;
};

export type StockVariation = StockMovement;

export type DocumentType = "FACTURE" | "AVOIR" | "BON_LIVRAISON" | "AUTRE";

export type ParsedDocumentLine = {
  reference: string;
  description?: string;
  quantity: number;
};
