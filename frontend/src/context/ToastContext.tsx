import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

type ToastTone = "success" | "error" | "info" | "warning";

interface ToastItem {
  id: string;
  title: string;
  message?: string;
  tone: ToastTone;
}

interface PushToastInput {
  title: string;
  message?: string;
  tone?: ToastTone;
  durationMs?: number;
}

interface ToastContextValue {
  pushToast: (toast: PushToastInput) => string;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

function toneStyles(tone: ToastTone) {
  switch (tone) {
    case "success":
      return {
        shell: "border-emerald-200 bg-emerald-50 text-emerald-950",
        badge: "bg-emerald-600 text-white",
      };
    case "error":
      return {
        shell: "border-red-200 bg-red-50 text-red-950",
        badge: "bg-red-600 text-white",
      };
    case "warning":
      return {
        shell: "border-amber-200 bg-amber-50 text-amber-950",
        badge: "bg-amber-600 text-white",
      };
    case "info":
    default:
      return {
        shell: "border-gray-200 bg-white text-gray-950",
        badge: "bg-gray-950 text-white",
      };
  }
}

function ToastIcon({ tone }: { tone: ToastTone }) {
  switch (tone) {
    case "success":
      return <span aria-hidden="true">✓</span>;
    case "error":
      return <span aria-hidden="true">!</span>;
    case "warning":
      return <span aria-hidden="true">!</span>;
    case "info":
    default:
      return <span aria-hidden="true">i</span>;
  }
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, number>>(new Map());

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timerId = timersRef.current.get(id);
    if (timerId) {
      window.clearTimeout(timerId);
      timersRef.current.delete(id);
    }
  }, []);

  const pushToast = useCallback(
    ({ title, message, tone = "info", durationMs = 3800 }: PushToastInput) => {
      const id = crypto.randomUUID();
      setToasts((current) => [{ id, title, message, tone }, ...current].slice(0, 4));

      const timerId = window.setTimeout(() => {
        dismissToast(id);
      }, durationMs);

      timersRef.current.set(id, timerId);
      return id;
    },
    [dismissToast],
  );

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
      timersRef.current.clear();
    };
  }, []);

  const contextValue = useMemo(
    () => ({ pushToast, dismissToast }),
    [pushToast, dismissToast],
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}

      <div className="pointer-events-none fixed right-4 top-4 z-[120] flex w-[calc(100vw-2rem)] max-w-md flex-col gap-3 sm:right-6 sm:top-6 sm:w-full">
        {toasts.map((toast) => {
          const styles = toneStyles(toast.tone);

          return (
            <article
              key={toast.id}
              role={toast.tone === "error" ? "alert" : "status"}
              aria-live={toast.tone === "error" ? "assertive" : "polite"}
              className={`pointer-events-auto rounded-2xl border px-4 py-3 shadow-[0_18px_50px_rgba(15,23,42,0.12)] backdrop-blur ${styles.shell} animate-popIn`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${styles.badge}`}>
                  <ToastIcon tone={toast.tone} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold leading-5 text-inherit">{toast.title}</h3>
                  {toast.message && <p className="mt-1 text-sm leading-5 text-inherit/75">{toast.message}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  className="rounded-full p-1 text-inherit/50 transition hover:text-inherit focus-visible:outline-none"
                  aria-label="Dismiss notification"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside ToastProvider.");
  }

  return context;
}