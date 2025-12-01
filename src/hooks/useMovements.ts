import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";

export const useMovementsByProduct = (productId?: number) =>
  useQuery({
    queryKey: ["movements", productId],
    queryFn: () => api.getMovementsByProduct(productId as number),
    enabled: Number.isInteger(productId),
  });
