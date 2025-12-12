import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { StockValuationPoint } from "../types";

type Params = {
  days?: number;
  stockLocationId?: number | "all";
};

export const useStockValuations = (params?: Params) =>
  useQuery<StockValuationPoint[]>({
    queryKey: ["stockValuations", params?.days ?? 30, params?.stockLocationId ?? "all"],
    queryFn: () => api.listStockValuations(params),
  });
