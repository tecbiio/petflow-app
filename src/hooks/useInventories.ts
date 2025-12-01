import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";

export const useInventoriesByProduct = (productId?: number) =>
  useQuery({
    queryKey: ["inventories", productId],
    queryFn: () => api.getInventoriesByProduct(productId as number),
    enabled: Number.isInteger(productId),
  });
