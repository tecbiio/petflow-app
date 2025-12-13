import { createContext, ReactNode, useCallback, useContext, useMemo, useRef, useState } from "react";

const TOAST_EXIT_MS = 160;

type Toast = {
  id: number;
  message: string;
  tone?: "success" | "warning" | "info" | "error";
  state?: "enter" | "leave";
};
type ToastContextValue = { addToast: (message: string, tone?: Toast["tone"]) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const autoDismissTimersRef = useRef(new Map<number, number>());
  const finalizeTimersRef = useRef(new Map<number, number>());

  const finalizeRemoveToast = useCallback((id: number) => {
    const autoTimer = autoDismissTimersRef.current.get(id);
    if (autoTimer) {
      window.clearTimeout(autoTimer);
      autoDismissTimersRef.current.delete(id);
    }

    const finalizeTimer = finalizeTimersRef.current.get(id);
    if (finalizeTimer) {
      window.clearTimeout(finalizeTimer);
      finalizeTimersRef.current.delete(id);
    }

    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissToast = useCallback(
    (id: number) => {
      const autoTimer = autoDismissTimersRef.current.get(id);
      if (autoTimer) {
        window.clearTimeout(autoTimer);
        autoDismissTimersRef.current.delete(id);
      }

      if (finalizeTimersRef.current.has(id)) return;

      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, state: "leave" } : t)));

      const finalizeTimer = window.setTimeout(() => finalizeRemoveToast(id), TOAST_EXIT_MS);
      finalizeTimersRef.current.set(id, finalizeTimer);
    },
    [finalizeRemoveToast],
  );

  const addToast = useCallback(
    (message: string, tone: Toast["tone"] = "info") => {
      const id = Date.now() + Math.random();
      setToasts((prev) => {
        const next = [...prev, { id, message, tone, state: "enter" } satisfies Toast];
        const trimmed = next.slice(-4);
        const dropped = next.slice(0, Math.max(0, next.length - trimmed.length));

        dropped.forEach((t) => {
          const autoTimer = autoDismissTimersRef.current.get(t.id);
          if (autoTimer) {
            window.clearTimeout(autoTimer);
            autoDismissTimersRef.current.delete(t.id);
          }
          const finalizeTimer = finalizeTimersRef.current.get(t.id);
          if (finalizeTimer) {
            window.clearTimeout(finalizeTimer);
            finalizeTimersRef.current.delete(t.id);
          }
        });

        return trimmed;
      });
      const timer = window.setTimeout(() => dismissToast(id), 3500);
      autoDismissTimersRef.current.set(id, timer);
    },
    [dismissToast],
  );

  const value = useMemo(() => ({ addToast }), [addToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-[6000] space-y-2" aria-live="polite" aria-relevant="additions">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            onClick={() => dismissToast(toast.id)}
            className={[
              "cursor-pointer rounded-xl border px-3 py-2 text-sm shadow-card transition hover:-translate-y-0.5",
              toast.state === "leave" ? "anim-toast-out pointer-events-none" : "anim-toast-in",
              toast.tone === "success" ? "border-emerald-100 bg-emerald-50 text-emerald-900" : "",
              toast.tone === "warning" ? "border-amber-100 bg-amber-50 text-amber-900" : "",
              toast.tone === "error" ? "border-rose-100 bg-rose-50 text-rose-900" : "",
              toast.tone === "info" ? "border-ink-100 bg-white text-ink-800" : "",
            ].join(" ")}
            title="Cliquer pour fermer"
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx.addToast;
}
