export type Family = {
  id: number;
  name: string;
  subFamilies?: SubFamily[];
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
  stockThreshold: number;
  description: string | null;
  imageUrl?: string | null;
  price: number;
  priceVdiHt: number;
  priceDistributorHt: number;
  priceSaleHt: number;
  purchasePrice: number;
  tvaRate: number;
  packagingId?: number | null;
  packaging?: Packaging | null;
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
  sourceDocumentType?: string | null;
  sourceDocumentId?: string | null;
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

export type StockValuationPoint = {
  valuationDate: string;
  totalValueCts: number;
  currency: string;
  scope: "ALL" | "LOCATION";
  stockLocationId: number | null;
  persisted: boolean;
};

export type Packaging = {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
};

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

export type MovementSign = "IN" | "OUT";

export type AxonautInvoiceSummary = {
  id: string | number;
  number?: string;
  date?: string;
  customerName?: string;
  status?: string;
  total?: number;
};

export type AxonautInvoiceLines = {
  invoice: AxonautInvoiceSummary;
  lines: ParsedDocumentLine[];
};
