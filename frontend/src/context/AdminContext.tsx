import { createContext, useContext, type ReactNode } from "react";

/* ── Minimal context for admin layout ────────────────────────── */
/* Audit logging is now handled server-side. This context remains
   as an extension point for future client-side admin state. */

interface AdminContextValue {
  /* placeholder — extend when needed */
}

const AdminContext = createContext<AdminContextValue | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  return (
    <AdminContext.Provider value={{}}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used inside AdminProvider");
  return ctx;
}
