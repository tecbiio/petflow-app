import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";

export const useProductStock = (productId: string) =>
  useQuery({
    queryKey: ["stock", productId],
    queryFn: () => api.getStockForProduct(productId),
    enabled: Boolean(productId),
  });

export const useProductVariations = (productId: string) =>
  useQuery({
    queryKey: ["stock", productId, "variations"],
    queryFn: () => api.getStockVariations(productId),
    enabled: Boolean(productId),
  });
