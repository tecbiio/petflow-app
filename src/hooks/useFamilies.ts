import { useQuery } from "../lib/queryClient";
import { api } from "../api/client";

export const useFamilies = () =>
  useQuery({
    queryKey: ["families"],
    queryFn: () => api.listFamilies(),
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

export const useSubFamilies = (familyId?: number) =>
  useQuery({
    queryKey: ["sub-families", familyId ?? "all"],
    queryFn: () => api.listSubFamilies(familyId),
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
