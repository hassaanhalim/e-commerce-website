import { useEffect, useMemo, useState } from "react";
import AdminStatsCard from "../../components/admin/AdminStatsCard";
import AdminTable, { type Column } from "../../components/admin/AdminTable";
import {
  catalogAdminApi,
  type AdminInventoryRow,
  type InventoryAdjustmentRecord,
} from "../../services/admin/catalog-admin-api";

type AdjustmentDraft = {
  onHandDelta: string;
  reservedDelta: string;
  reason: string;
};

type InventoryFilterState = {
  search: string;
  lowStock: boolean;
  outOfStock: boolean;
};

type InventoryTableRow = AdminInventoryRow & { id: string };

function defaultAdjustmentDraft(): AdjustmentDraft {
  return {
    onHandDelta: "0",
    reservedDelta: "0",
    reason: "",
  };
}

export function InventoryPage() {
  const [rows, setRows] = useState<AdminInventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<InventoryFilterState>({
    search: "",
    lowStock: false,
    outOfStock: false,
  });
  const [adjustmentDrafts, setAdjustmentDrafts] = useState<Record<string, AdjustmentDraft>>({});
  const [thresholdDrafts, setThresholdDrafts] = useState<Record<string, string>>({});
  const [historyRow, setHistoryRow] = useState<AdminInventoryRow | null>(null);
  const [history, setHistory] = useState<InventoryAdjustmentRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");

    catalogAdminApi
      .getInventory({
        search: filters.search.trim() || undefined,
        lowStock: filters.lowStock || undefined,
        outOfStock: filters.outOfStock || undefined,
        limit: 100,
      })
      .then((response) => {
        if (!active) {
          return;
        }

        setRows(response.data);
      })
      .catch((fetchError: unknown) => {
        if (!active) {
          return;
        }

        setError(fetchError instanceof Error ? fetchError.message : "Failed to load inventory.");
        setRows([]);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [filters]);

  const inventoryStats = useMemo(() => {
    const lowStockCount = rows.filter((row) => row.isLowStock).length;
    const outOfStockCount = rows.filter((row) => row.isOutOfStock).length;
    const healthyCount = rows.filter((row) => !row.isLowStock && !row.isOutOfStock).length;
    const activeVariants = rows.filter((row) => row.isActive).length;

    return {
      lowStockCount,
      outOfStockCount,
      healthyCount,
      activeVariants,
    };
  }, [rows]);

  const tableRows = useMemo<InventoryTableRow[]>(() => {
    return rows.map((row) => ({
      ...row,
      id: row.variantId,
    }));
  }, [rows]);

  const updateAdjustmentDraft = (
    variantId: string,
    field: keyof AdjustmentDraft,
    value: string,
  ) => {
    setAdjustmentDrafts((current) => ({
      ...current,
      [variantId]: {
        onHandDelta: current[variantId]?.onHandDelta ?? "0",
        reservedDelta: current[variantId]?.reservedDelta ?? "0",
        reason: current[variantId]?.reason ?? "",
        [field]: value,
      },
    }));
  };

  const updateThresholdDraft = (variantId: string, value: string) => {
    setThresholdDrafts((current) => ({
      ...current,
      [variantId]: value,
    }));
  };

  const handleSaveAdjustment = async (row: AdminInventoryRow) => {
    const draft = adjustmentDrafts[row.variantId] ?? defaultAdjustmentDraft();
    const onHandDelta = Number(draft.onHandDelta || 0);
    const reservedDelta = Number(draft.reservedDelta || 0);

    if (!Number.isFinite(onHandDelta) || !Number.isFinite(reservedDelta)) {
      setError("Stock deltas must be valid numbers.");
      return;
    }

    try {
      const adjustedRow = await catalogAdminApi.adjustInventory(row.variantId, {
        type: onHandDelta < 0 ? "CORRECTION" : onHandDelta > 0 ? "RESTOCK" : reservedDelta > 0 ? "RESERVE" : "RELEASE",
        onHandDelta,
        reservedDelta,
        reason: draft.reason.trim() || "Manual inventory adjustment",
      });

      setRows((current) => current.map((item) => (item.variantId === row.variantId ? adjustedRow : item)));
      setAdjustmentDrafts((current) => {
        const next = { ...current };
        delete next[row.variantId];
        return next;
      });
      setError("");
    } catch (adjustError: unknown) {
      setError(adjustError instanceof Error ? adjustError.message : "Failed to adjust inventory.");
    }
  };

  const handleSaveThreshold = async (row: AdminInventoryRow) => {
    const nextThreshold = Number(thresholdDrafts[row.variantId] ?? row.lowStockThreshold);

    if (!Number.isFinite(nextThreshold) || nextThreshold < 0) {
      setError("Low-stock threshold must be a non-negative number.");
      return;
    }

    try {
      const updatedRow = await catalogAdminApi.updateInventoryThreshold(row.variantId, {
        lowStockThreshold: nextThreshold,
      });

      setRows((current) => current.map((item) => (item.variantId === row.variantId ? updatedRow : item)));
      setError("");
    } catch (thresholdError: unknown) {
      setError(thresholdError instanceof Error ? thresholdError.message : "Failed to update threshold.");
    }
  };

  const handleOpenHistory = async (row: AdminInventoryRow) => {
    setHistoryRow(row);
    setHistory([]);
    setHistoryError("");
    setHistoryLoading(true);

    try {
      const response = await catalogAdminApi.getInventoryHistory(row.variantId);
      setHistory(response);
    } catch (historyFetchError: unknown) {
      setHistoryError(historyFetchError instanceof Error ? historyFetchError.message : "Failed to load adjustment history.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const columns: Column<InventoryTableRow>[] = [
    {
      header: "Product",
      accessor: (row) => (
        <div>
          <p className="font-bold text-gray-900">{row.productName}</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            {row.productCode} · {row.sku}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Size {row.size} · {row.color}
          </p>
          {!row.isActive && <p className="mt-1 text-xs font-semibold text-amber-700">Deactivated</p>}
        </div>
      ),
      sortable: true,
      className: "w-1/4",
    },
    {
      header: "On Hand",
      accessor: (row) => <span className="font-semibold text-gray-900">{row.quantityOnHand}</span>,
      sortable: true,
    },
    {
      header: "Reserved",
      accessor: (row) => <span className="font-semibold text-gray-900">{row.reservedQuantity}</span>,
      sortable: true,
    },
    {
      header: "Available",
      accessor: (row) => (
        <span
          className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-bold ${
            row.isOutOfStock
              ? "bg-red-50 text-red-700"
              : row.isLowStock
              ? "bg-amber-50 text-amber-700"
              : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {row.availableQuantity}
        </span>
      ),
      sortable: true,
    },
    {
      header: "Threshold",
      accessor: (row) => (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            value={thresholdDrafts[row.variantId] ?? String(row.lowStockThreshold)}
            onChange={(event) => updateThresholdDraft(row.variantId, event.target.value)}
            className="w-20 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-center text-sm font-semibold outline-none focus:border-black"
          />
          <button
            type="button"
            onClick={() => handleSaveThreshold(row)}
            className="rounded-xl bg-black px-3 py-2 text-xs font-semibold text-white transition hover:bg-gray-800"
          >
            Update
          </button>
        </div>
      ),
    },
    {
      header: "Adjustment",
      accessor: (row) => {
        const draft = adjustmentDrafts[row.variantId] ?? defaultAdjustmentDraft();

        return (
          <div className="min-w-[280px] space-y-2">
            <div className="flex gap-2">
              <input
                type="number"
                value={draft.onHandDelta}
                onChange={(event) => updateAdjustmentDraft(row.variantId, "onHandDelta", event.target.value)}
                className="w-20 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-center text-sm font-semibold outline-none focus:border-black"
                placeholder="On hand"
              />
              <input
                type="number"
                value={draft.reservedDelta}
                onChange={(event) => updateAdjustmentDraft(row.variantId, "reservedDelta", event.target.value)}
                className="w-20 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-center text-sm font-semibold outline-none focus:border-black"
                placeholder="Reserved"
              />
            </div>
            <input
              type="text"
              value={draft.reason}
              onChange={(event) => updateAdjustmentDraft(row.variantId, "reason", event.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-black"
              placeholder="Reason"
            />
            <button
              type="button"
              onClick={() => handleSaveAdjustment(row)}
              className="rounded-xl border border-black px-3 py-2 text-xs font-semibold text-black transition hover:bg-gray-50"
            >
              Save
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        <AdminStatsCard title="Variants" value={rows.length} description="Loaded from backend inventory" />
        <AdminStatsCard title="Healthy" value={inventoryStats.healthyCount} description="Available above threshold" />
        <AdminStatsCard title="Low Stock" value={inventoryStats.lowStockCount} description="At or below threshold" trend={inventoryStats.lowStockCount > 0 ? "down" : "neutral"} />
        <AdminStatsCard title="Out of Stock" value={inventoryStats.outOfStockCount} description="Available quantity is zero" trend={inventoryStats.outOfStockCount > 0 ? "down" : "neutral"} />
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-3">
          <input
            type="text"
            value={filters.search}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            placeholder="Search product, SKU, size, or color..."
            className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-black"
          />
          <label className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700">
            <input
              type="checkbox"
              checked={filters.lowStock}
              onChange={(event) => setFilters((current) => ({ ...current, lowStock: event.target.checked }))}
            />
            Low stock only
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700">
            <input
              type="checkbox"
              checked={filters.outOfStock}
              onChange={(event) => setFilters((current) => ({ ...current, outOfStock: event.target.checked }))}
            />
            Out of stock only
          </label>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white px-6 py-10 text-center text-sm font-semibold text-gray-500 shadow-sm">
          Loading inventory...
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white px-6 py-10 text-center text-sm font-semibold text-gray-500 shadow-sm">
          No inventory records found.
        </div>
      ) : (
        <AdminTable
          title="Inventory"
          subtitle="Backend inventory source of truth"
          data={tableRows}
          columns={columns}
          searchKeys={[]}
          actions={(row) => (
            <button
              type="button"
              onClick={() => handleOpenHistory(row)}
              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-black hover:text-black"
            >
              History
            </button>
          )}
        />
      )}

      {historyRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[80vh] w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Inventory history</p>
                <h3 className="mt-1 text-xl font-bold text-gray-950">
                  {historyRow.productName} · {historyRow.sku}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setHistoryRow(null);
                  setHistory([]);
                  setHistoryError("");
                }}
                className="rounded-full border border-gray-300 px-3 py-1 text-sm font-semibold text-gray-600 transition hover:border-black hover:text-black"
              >
                Close
              </button>
            </div>

            <div className="max-h-[calc(80vh-73px)] overflow-y-auto px-6 py-5">
              {historyLoading ? (
                <p className="text-sm font-medium text-gray-500">Loading history...</p>
              ) : historyError ? (
                <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{historyError}</p>
              ) : history.length === 0 ? (
                <p className="text-sm font-medium text-gray-500">No inventory adjustments recorded.</p>
              ) : (
                <div className="space-y-3">
                  {history.map((entry) => (
                    <article key={entry.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-gray-950">{entry.type}</p>
                          <p className="mt-1 text-xs text-gray-500">{entry.reason}</p>
                        </div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                          {new Date(entry.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="mt-3 grid gap-2 text-xs text-gray-600 sm:grid-cols-2 lg:grid-cols-3">
                        <span>On hand: {entry.beforeOnHand} → {entry.afterOnHand}</span>
                        <span>Reserved: {entry.beforeReserved} → {entry.afterReserved}</span>
                        <span>Admin: {entry.performedBy.fullName}</span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InventoryPage;