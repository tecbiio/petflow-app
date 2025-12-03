import { useCallback, useEffect, useMemo, useState } from "react";

export type AppSettings = {
  husseLoginUrl?: string;
  husseUsername?: string;
  hussePassword?: string;
  axonautBaseUrl?: string;
  axonautApiKey?: string;
  axonautUpdateTemplate?: string;
  axonautLookupTemplate?: string;
  themeColor?: string;
};

const STORAGE_KEY = "petflow_settings";
const DEFAULT_COLOR = "#4f46e5";

function read(): AppSettings {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AppSettings) : {};
  } catch {
    return {};
  }
}

function write(settings: AppSettings) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
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
