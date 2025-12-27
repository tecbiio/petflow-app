import { useQuery } from "../lib/queryClient";
import { api } from "../api/client";

export const useMovementsByProduct = (productId?: number) =>
  useQuery({
    queryKey: ["stock-movements", productId],
    queryFn: () => api.getMovementsByProduct(productId as number),
    enabled: Number.isInteger(productId),
  });
