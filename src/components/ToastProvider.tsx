import { createContext, ReactNode, useCallback, useContext, useMemo, useRef, useState } from "react";

type Toast = { id: number; message: string; tone?: "success" | "warning" | "info" | "error" };
type ToastContextValue = { addToast: (message: string, tone?: Toast["tone"]) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const timersRef = useRef(new Map<number, number>());

  const removeToast = useCallback((id: number) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, tone: Toast["tone"] = "info") => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, tone }].slice(-4));
      const timer = window.setTimeout(() => removeToast(id), 3500);
      timersRef.current.set(id, timer);
    },
    [removeToast],
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
            onClick={() => removeToast(toast.id)}
            className={[
              "cursor-pointer rounded-xl border px-3 py-2 text-sm shadow-card transition hover:-translate-y-0.5",
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
