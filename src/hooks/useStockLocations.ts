import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";

type StockLocationFilter = {
  active?: boolean;
};

export const useStockLocations = (filter?: StockLocationFilter) =>
  useQuery({
    queryKey: ["stockLocations", filter?.active ?? "all"],
    queryFn: () => api.listStockLocations(filter),
  });

export const useDefaultStockLocation = () =>
  useQuery({
    queryKey: ["stockLocations", "default"],
    queryFn: api.getDefaultStockLocation,
  });
