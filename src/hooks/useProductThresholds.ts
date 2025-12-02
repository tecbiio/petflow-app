import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "productThresholds";
const DEFAULT_THRESHOLD = 10;

type ThresholdMap = Record<number, number>;

function readFromStorage(): ThresholdMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ThresholdMap) : {};
  } catch {
    return {};
  }
}

function writeToStorage(map: ThresholdMap) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore storage errors
  }
}

export function useProductThresholds() {
  const [thresholds, setThresholds] = useState<ThresholdMap>(() => readFromStorage());

  useEffect(() => {
    writeToStorage(thresholds);
  }, [thresholds]);

  const getThreshold = useCallback(
    (productId: number) => thresholds[productId] ?? DEFAULT_THRESHOLD,
    [thresholds],
  );

  const setThreshold = useCallback((productId: number, value: number) => {
    setThresholds((prev) => ({
      ...prev,
      [productId]: Math.max(0, value),
    }));
  }, []);

  const clearThresholds = useCallback(() => setThresholds({}), []);

  return useMemo(
    () => ({
      getThreshold,
      setThreshold,
      clearThresholds,
      thresholds,
      defaultThreshold: DEFAULT_THRESHOLD,
    }),
    [clearThresholds, getThreshold, setThreshold, thresholds],
  );
}
