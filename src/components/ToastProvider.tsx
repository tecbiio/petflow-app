import { createContext, ReactNode, useContext, useMemo, useState } from "react";

type Toast = { id: number; message: string; tone?: "success" | "warning" | "info" | "error" };
type ToastContextValue = { addToast: (message: string, tone?: Toast["tone"]) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, tone: Toast["tone"] = "info") => {
    setToasts((prev) => {
      const next: Toast[] = [...prev, { id: Date.now() + Math.random(), message, tone }];
      return next.slice(-4); // limite le nombre affiché
    });
    setTimeout(() => {
      setToasts((prev) => prev.slice(1));
    }, 3500);
  };

  const value = useMemo(() => ({ addToast }), []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={[
              "rounded-xl border px-3 py-2 text-sm shadow-card",
              toast.tone === "success" ? "border-emerald-100 bg-emerald-50 text-emerald-900" : "",
              toast.tone === "warning" ? "border-amber-100 bg-amber-50 text-amber-900" : "",
              toast.tone === "error" ? "border-rose-100 bg-rose-50 text-rose-900" : "",
              toast.tone === "info" ? "border-ink-100 bg-white text-ink-800" : "",
            ].join(" ")}
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
