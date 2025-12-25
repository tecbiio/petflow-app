import { useQuery } from "../lib/queryClient";
import { api } from "../api/client";

type ProductFilter = {
  active?: boolean;
};

export const useProducts = (filter?: ProductFilter) =>
  useQuery({
    queryKey: ["products", filter?.active ?? "all"],
    queryFn: () => api.listProducts(filter),
  });

export const useProduct = (productId?: number) =>
  useQuery({
    queryKey: ["product", productId],
    queryFn: () => api.getProduct(productId as number),
    enabled: Number.isInteger(productId),
  });
