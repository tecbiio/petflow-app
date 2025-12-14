import { useCallback, useEffect, useMemo, useState } from "react";

export type AppSettings = {
  husseLoginUrl?: string;
  husseUsername?: string;
  hussePassword?: string;
  axonautBaseUrl?: string;
  axonautApiKey?: string;
  axonautUpdateTemplate?: string;
  axonautLookupTemplate?: string;
  axonautAutoSyncInvoices?: boolean;
  themeColor?: string;
};

const STORAGE_KEY = "petflow_settings";
const DEFAULT_COLOR = "#4f46e5";

function read(): AppSettings {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as AppSettings;
    const { husseUsername, hussePassword, axonautApiKey, ...safe } = parsed;
    return safe;
  } catch {
    return {};
  }
}

function write(settings: AppSettings) {
  if (typeof window === "undefined") return;
  try {
    const { husseUsername, hussePassword, axonautApiKey, ...safe } = settings;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
  } catch {
    // ignore storage errors
  }
}

function applyTheme(color?: string) {
  if (typeof document === "undefined") return;
  const value = color || DEFAULT_COLOR;
  document.documentElement.style.setProperty("--brand-color", value);
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => read());

  useEffect(() => {
    applyTheme(settings.themeColor);
  }, [settings.themeColor]);

  const update = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      write(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setSettings({});
    write({});
    applyTheme(DEFAULT_COLOR);
  }, []);

  return useMemo(
    () => ({
      settings,
      update,
      reset,
      defaultColor: DEFAULT_COLOR,
    }),
    [reset, settings, update],
  );
}
