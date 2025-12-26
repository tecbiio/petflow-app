import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type QueryKey = readonly unknown[] | string;
type CacheEventType = "update" | "invalidate" | "remove";
type CacheListener = (event: { type: CacheEventType }) => void;

type CacheEntry = {
  keyParts: readonly unknown[];
  data?: unknown;
  error?: Error | null;
  listeners: Set<CacheListener>;
};

const normalizeKey = (key: QueryKey): readonly unknown[] => (Array.isArray(key) ? key : [key]);
const hashKey = (key: QueryKey): string => JSON.stringify(normalizeKey(key));

const isPrefixMatch = (full: readonly unknown[], prefix: readonly unknown[]): boolean => {
  if (prefix.length > full.length) return false;
  for (let i = 0; i < prefix.length; i += 1) {
    if (!Object.is(full[i], prefix[i])) return false;
  }
  return true;
};

export class QueryClient {
  private cache = new Map<string, CacheEntry>();

  private getEntry(key: QueryKey): CacheEntry {
    const hashed = hashKey(key);
    const existing = this.cache.get(hashed);
    if (existing) return existing;
    const entry: CacheEntry = { keyParts: normalizeKey(key), listeners: new Set() };
    this.cache.set(hashed, entry);
    return entry;
  }

  getQueryData<T = unknown>(key: QueryKey): T | undefined {
    return this.cache.get(hashKey(key))?.data as T | undefined;
  }

  setQueryData<T = unknown>(key: QueryKey, updater: T | ((prev: T | undefined) => T)): void {
    const entry = this.getEntry(key);
    const next = typeof updater === "function" ? (updater as (prev: T | undefined) => T)(entry.data as T) : updater;
    entry.data = next;
    entry.error = null;
    entry.listeners.forEach((listener) => listener({ type: "update" }));
  }

  invalidateQueries(opts: { queryKey: QueryKey }): void {
    const prefix = normalizeKey(opts.queryKey);
    for (const entry of this.cache.values()) {
      if (!isPrefixMatch(entry.keyParts, prefix)) continue;
      entry.listeners.forEach((listener) => listener({ type: "invalidate" }));
    }
  }

  removeQueries(opts: { queryKey: QueryKey }): void {
    const prefix = normalizeKey(opts.queryKey);
    for (const entry of this.cache.values()) {
      if (!isPrefixMatch(entry.keyParts, prefix)) continue;
      entry.data = undefined;
      entry.error = null;
      entry.listeners.forEach((listener) => listener({ type: "remove" }));
    }
  }

  async fetchQuery<T = unknown>(opts: { queryKey: QueryKey; queryFn: () => Promise<T> }): Promise<T> {
    const data = await opts.queryFn();
    this.setQueryData(opts.queryKey, data);
    return data;
  }

  subscribe(key: QueryKey, listener: CacheListener): () => void {
    const entry = this.getEntry(key);
    entry.listeners.add(listener);
    return () => entry.listeners.delete(listener);
  }
}

const QueryClientContext = createContext<QueryClient | null>(null);

export function QueryClientProvider({ client, children }: { client: QueryClient; children: ReactNode }) {
  return createElement(QueryClientContext.Provider, { value: client }, children);
}

export function useQueryClient(): QueryClient {
  const client = useContext(QueryClientContext);
  if (!client) {
    throw new Error("QueryClientProvider manquant.");
  }
  return client;
}

export type UseQueryOptions<T = any> = {
  queryKey: QueryKey;
  queryFn: () => Promise<T>;
  enabled?: boolean;
} & Record<string, unknown>;

export type UseQueryResult<T = any> = {
  data: T | undefined;
  error: Error | null;
  isError: boolean;
  isLoading: boolean;
  refetch: () => Promise<T | undefined>;
};

export function useQuery<T = any>(options: UseQueryOptions<T>): UseQueryResult<T> {
  const { queryKey, queryFn, enabled = true } = options;
  const client = useQueryClient();
  const keyHash = useMemo(() => hashKey(queryKey), [queryKey]);
  const mountedRef = useRef(true);
  const inFlightRef = useRef(false);
  const [data, setData] = useState<T | undefined>(() => client.getQueryData<T>(queryKey));
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(enabled && data === undefined);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchData = useCallback(async (): Promise<T | undefined> => {
    if (!enabled) return undefined;
    if (inFlightRef.current) return client.getQueryData<T>(queryKey);
    inFlightRef.current = true;
    if (mountedRef.current) {
      setIsLoading(true);
      setError(null);
    }
    try {
      const result = await queryFn();
      client.setQueryData(queryKey, result);
      if (mountedRef.current) {
        setData(result);
        setIsLoading(false);
      }
      return result;
    } catch (err) {
      const normalized = err instanceof Error ? err : new Error(String(err));
      if (mountedRef.current) {
        setError(normalized);
        setIsLoading(false);
      }
      return undefined;
    } finally {
      inFlightRef.current = false;
    }
  }, [client, enabled, queryFn, queryKey]);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    const cached = client.getQueryData<T>(queryKey);
    if (cached !== undefined) {
      setData(cached);
      setIsLoading(false);
      return;
    }
    void fetchData();
  }, [client, enabled, fetchData, keyHash]);

  useEffect(() => {
    return client.subscribe(queryKey, (event) => {
      if (!mountedRef.current) return;
      if (event.type === "update") {
        const cached = client.getQueryData<T>(queryKey);
        setData(cached);
        setError(null);
        setIsLoading(false);
        return;
      }
      if (!enabled) return;
      void fetchData();
    });
  }, [client, enabled, fetchData, keyHash]);

  return {
    data,
    error,
    isError: Boolean(error),
    isLoading,
    refetch: fetchData,
  };
}

export type UseQueriesOptions = {
  queries: UseQueryOptions<any>[];
};

export function useQueries({ queries }: UseQueriesOptions): UseQueryResult<any>[] {
  const client = useQueryClient();
  const queriesRef = useRef(queries);
  queriesRef.current = queries;
  const mountedRef = useRef(true);
  const inFlight = useRef(new Set<string>());

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const signature = useMemo(() => queries.map((q) => hashKey(q.queryKey)).join("|"), [queries]);
  const enabledSignature = useMemo(
    () => queries.map((q) => (q.enabled === false ? "0" : "1")).join("|"),
    [queries],
  );

  const [states, setStates] = useState(() =>
    queries.map((query) => {
      const cached = client.getQueryData(query.queryKey);
      return {
        data: cached,
        error: null as Error | null,
        isLoading: query.enabled === false ? false : cached === undefined,
      };
    }),
  );

  const runQuery = useCallback(
    async (index: number) => {
      const current = queriesRef.current[index];
      if (!current || current.enabled === false) return undefined;
      const key = hashKey(current.queryKey);
      if (inFlight.current.has(key)) return undefined;
      inFlight.current.add(key);
      if (mountedRef.current) {
        setStates((prev) => {
          const next = [...prev];
          if (next[index]) next[index] = { ...next[index], isLoading: true, error: null };
          return next;
        });
      }
      try {
        const result = await current.queryFn();
        client.setQueryData(current.queryKey, result);
        if (mountedRef.current) {
          setStates((prev) => {
            const next = [...prev];
            if (next[index]) next[index] = { data: result, error: null, isLoading: false };
            return next;
          });
        }
        return result;
      } catch (err) {
        const normalized = err instanceof Error ? err : new Error(String(err));
        if (mountedRef.current) {
          setStates((prev) => {
            const next = [...prev];
            if (next[index]) next[index] = { ...next[index], error: normalized, isLoading: false };
            return next;
          });
        }
        return undefined;
      } finally {
        inFlight.current.delete(key);
      }
    },
    [client],
  );

  useEffect(() => {
    setStates(
      queries.map((query) => {
        const cached = client.getQueryData(query.queryKey);
        return {
          data: cached,
          error: null as Error | null,
          isLoading: query.enabled === false ? false : cached === undefined,
        };
      }),
    );
  }, [client, signature]);

  useEffect(() => {
    if (!queriesRef.current.length) return undefined;
    const unsubscribers = queriesRef.current.map((query, index) =>
      client.subscribe(query.queryKey, (event) => {
        if (!mountedRef.current) return;
        if (event.type === "update") {
          const cached = client.getQueryData(query.queryKey);
          setStates((prev) => {
            const next = [...prev];
            if (next[index]) next[index] = { data: cached, error: null, isLoading: false };
            return next;
          });
          return;
        }
        if (query.enabled === false) return;
        void runQuery(index);
      }),
    );
    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [client, runQuery, signature]);

  useEffect(() => {
    queriesRef.current.forEach((query, index) => {
      if (query.enabled === false) return;
      const cached = client.getQueryData(query.queryKey);
      if (cached !== undefined) return;
      void runQuery(index);
    });
  }, [client, enabledSignature, runQuery, signature]);

  return useMemo(
    () =>
      states.map((state, index) => ({
        data: state.data,
        error: state.error,
        isError: Boolean(state.error),
        isLoading: state.isLoading,
        refetch: () => runQuery(index),
      })),
    [runQuery, states],
  );
}

export type UseMutationOptions<TData = any, TVariables = void> = {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
} & Record<string, unknown>;

export type UseMutationResult<TData = any, TVariables = void> = {
  mutate: (variables?: TVariables) => void;
  mutateAsync: (variables?: TVariables) => Promise<TData>;
  isPending: boolean;
  isError: boolean;
  isSuccess: boolean;
  error: Error | null;
};

export function useMutation<TData = any, TVariables = void>(
  options: UseMutationOptions<TData, TVariables>,
): UseMutationResult<TData, TVariables> {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const mutateAsync = useCallback(
    async (variables?: TVariables) => {
      setIsPending(true);
      setIsSuccess(false);
      setError(null);
      try {
        const result = await options.mutationFn(variables as TVariables);
        options.onSuccess?.(result, variables as TVariables);
        setIsPending(false);
        setIsSuccess(true);
        return result;
      } catch (err) {
        const normalized = err instanceof Error ? err : new Error(String(err));
        setError(normalized);
        options.onError?.(normalized, variables as TVariables);
        setIsPending(false);
        setIsSuccess(false);
        throw normalized;
      }
    },
    [options],
  );

  const mutate = useCallback(
    (variables?: TVariables) => {
      void mutateAsync(variables);
    },
    [mutateAsync],
  );

  return {
    mutate,
    mutateAsync,
    isPending,
    isError: Boolean(error),
    isSuccess,
    error,
  };
}
