export type Family = {
  id: number;
  name: string;
};

export type SubFamily = {
  id: number;
  name: string;
  familyId: number;
  family?: Family | null;
};

export type Product = {
  id: number;
  name: string;
  sku: string;
  description: string | null;
  price: number;
  isActive?: boolean;
  axonautProductId?: number | null;
  family?: Family | null;
  subFamily?: SubFamily | null;
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
  axonautProductId?: number;
  axonautProductCode?: string;
  axonautProductName?: string;
  axonautProductPrice?: number;
};
