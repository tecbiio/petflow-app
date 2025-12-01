import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";

export const useInventoriesByProduct = (productId: string) =>
  useQuery({
    queryKey: ["inventories", productId],
    queryFn: () => api.getInventoriesByProduct(productId),
    enabled: Boolean(productId),
  });
