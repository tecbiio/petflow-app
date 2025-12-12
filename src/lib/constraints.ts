export type ProductPayload = {
  name?: string;
  sku?: string;
  price?: number;
  priceVdiHt?: number;
  priceDistributorHt?: number;
  priceSaleHt?: number;
  purchasePrice?: number;
  tvaRate?: number;
  description?: string | null;
  isActive?: boolean;
  familyId?: number | null;
  subFamilyId?: number | null;
  packagingId?: number | null;
};

export type ValidationOptions = {
  partial?: boolean;
};

export function validateProductPayload(raw: ProductPayload, options: ValidationOptions = {}) {
  const { partial = false } = options;
  const errors: string[] = [];
  const payload: ProductPayload = {};

  const requireField = (field: string) => {
    if (!partial) errors.push(`${field} requis`);
  };

  if (raw.name !== undefined) {
    const name = raw.name.trim();
    if (!name) errors.push("Le nom ne peut pas être vide");
    else payload.name = name;
  } else {
    requireField("Nom");
  }

  if (raw.sku !== undefined) {
    const sku = raw.sku.trim();
    if (!sku) errors.push("Le SKU ne peut pas être vide");
    else payload.sku = sku;
  } else {
    requireField("SKU");
  }

  if (raw.price !== undefined) {
    if (!Number.isFinite(raw.price)) {
      errors.push("Le prix doit être un nombre");
    } else {
      payload.price = raw.price;
    }
  } else {
    requireField("Prix");
  }

  type NumericProductKey = "priceVdiHt" | "priceDistributorHt" | "priceSaleHt" | "purchasePrice" | "tvaRate";

  const numeric = (value: unknown, label: string, key: NumericProductKey) => {
    if (value === undefined) {
      if (!partial) errors.push(`${label} requis`);
      return;
    }
    if (!Number.isFinite(value as number)) {
      errors.push(`${label} doit être un nombre`);
    } else {
      payload[key] = value as number;
    }
  };

  numeric(raw.priceVdiHt, "Tarif VDI HT", "priceVdiHt");
  numeric(raw.priceDistributorHt, "Tarif Distributeur HT", "priceDistributorHt");
  numeric(raw.priceSaleHt, "Prix de vente HT", "priceSaleHt");
  numeric(raw.purchasePrice, "Prix d'achat", "purchasePrice");
  numeric(raw.tvaRate, "Taux de TVA", "tvaRate");

  if (raw.description !== undefined) {
    payload.description = raw.description ?? null;
  }
  if (raw.packagingId !== undefined) {
    if (raw.packagingId === null) {
      payload.packagingId = null;
    } else if (!Number.isInteger(raw.packagingId)) {
      errors.push("Conditionnement invalide");
    } else {
      payload.packagingId = raw.packagingId;
    }
  }
  if (raw.isActive !== undefined) {
    payload.isActive = raw.isActive;
  }
  if (raw.familyId !== undefined) {
    payload.familyId = raw.familyId ?? null;
  }
  if (raw.subFamilyId !== undefined) {
    payload.subFamilyId = raw.subFamilyId ?? null;
  }

  if (partial && Object.keys(raw).length === 0) {
    errors.push("Aucune donnée à mettre à jour");
  }

  return { payload, errors };
}
