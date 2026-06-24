"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CheckCircle2, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Toast = {
  id: number;
  title: string;
  description?: string;
  tone?: "success" | "info" | "error";
};

type ToastContextValue = {
  toast: (toast: Omit<Toast, "id">) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((items) => items.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (nextToast: Omit<Toast, "id">) => {
      const id = Date.now();
      setToasts((items) => [...items, { id, ...nextToast }]);
      window.setTimeout(() => remove(id), 3600);
    },
    [remove],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3">
        {toasts.map((item) => (
          <div
            key={item.id}
            className={cn(
              "rounded-[18px] border bg-card p-4 shadow-milk",
              item.tone === "success" && "border-pink-line",
              item.tone === "error" && "border-[#FFD1CC]",
              (!item.tone || item.tone === "info") && "border-blue-line",
            )}
          >
            <div className="flex gap-3">
              {item.tone === "success" ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-pink-deep" />
              ) : (
                <Info className="mt-0.5 h-5 w-5 text-blue-deep" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-bold text-ink">{item.title}</p>
                {item.description ? <p className="mt-1 text-sm text-slate">{item.description}</p> : null}
              </div>
              <Button variant="ghost" size="icon" onClick={() => remove(item.id)} aria-label="关闭提示">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
