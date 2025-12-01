import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";

export const useStockLocations = () =>
  useQuery({
    queryKey: ["stockLocations"],
    queryFn: api.listStockLocations,
  });

export const useDefaultStockLocation = () =>
  useQuery({
    queryKey: ["stockLocations", "default"],
    queryFn: api.getDefaultStockLocation,
  });
