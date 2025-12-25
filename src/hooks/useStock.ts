import { useQuery } from "../lib/queryClient";
import { api } from "../api/client";

export const useProductStock = (productId?: number) =>
  useQuery({
    queryKey: ["stock", productId],
    queryFn: () => api.getStockForProduct(productId as number),
    enabled: Number.isInteger(productId),
  });

export const useProductVariations = (productId?: number) =>
  useQuery({
    queryKey: ["stock", productId, "variations"],
    queryFn: () => api.getStockVariations(productId as number),
    enabled: Number.isInteger(productId),
  });
