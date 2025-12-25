import { useQuery } from "../lib/queryClient";
import { api } from "../api/client";

export const usePackagings = () =>
  useQuery({
    queryKey: ["packagings"],
    queryFn: () => api.listPackagings(),
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
