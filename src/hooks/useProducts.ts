import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";

export const useProducts = () =>
  useQuery({
    queryKey: ["products"],
    queryFn: api.listProducts,
  });

export const useProduct = (productId: string) =>
  useQuery({
    queryKey: ["product", productId],
    queryFn: () => api.getProduct(productId),
    enabled: Boolean(productId),
  });
