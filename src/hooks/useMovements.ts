import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";

export const useMovementsByProduct = (productId: string) =>
  useQuery({
    queryKey: ["movements", productId],
    queryFn: () => api.getMovementsByProduct(productId),
    enabled: Boolean(productId),
  });
