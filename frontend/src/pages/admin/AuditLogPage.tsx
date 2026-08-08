import { useEffect, useState } from "react";
import { adminApi, type BackendAuditLogItem } from "../../services/admin-api";
import AdminTable, { type Column } from "../../components/admin/AdminTable";

export function AuditLogPage() {
  const [logs, setLogs] = useState<BackendAuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchLogs = () => {
    setLoading(true);
    adminApi
      .getAuditLogs({
        search: search.trim() || undefined,
        action: actionFilter || undefined,
        page,
        limit: 15,
      })
      .then((res) => {
        setLogs(res.data);
        setTotalPages(res.meta.totalPages);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, page]);

  const columns: Column<BackendAuditLogItem>[] = [
    {
      header: "Timestamp",
      accessor: (row) => new Date(row.createdAt).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" }),
      sortable: true,
      className: "font-mono text-xs text-gray-500",
    },
    {
      header: "Actor",
      accessor: (row) => (
        <div>
          <p className="font-bold text-gray-900">{row.actorUser?.fullName || "System / System Script"}</p>
          <p className="text-[11px] text-gray-400">{row.actorUser?.email || "N/A"}</p>
        </div>
      ),
      sortable: true,
    },
    {
      header: "Action",
      accessor: (row) => (
        <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-800 uppercase font-mono">
          {row.action}
        </span>
      ),
      sortable: true,
    },
    {
      header: "Entity Type",
      accessor: (row) => <span className="font-semibold text-xs text-gray-700">{row.entityType} {row.entityId ? `(#${row.entityId.slice(0, 8)})` : ""}</span>,
      sortable: true,
    },
    {
      header: "Description & Metadata",
      accessor: (row) => (
        <div className="text-xs space-y-0.5 max-w-md">
          <p className="font-medium text-gray-900">{row.description}</p>
          {row.metadata && (
            <p className="font-mono text-[10px] text-gray-400 truncate">
              {JSON.stringify(row.metadata)}
            </p>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-gray-950 tracking-tight">System Audit Log</h1>
          <p className="text-xs text-gray-500 font-medium">Immutable, read-only audit records of administrative actions and status decisions.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search action, description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchLogs()}
            className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-black"
          />

          <input
            type="text"
            placeholder="Filter action (e.g. CUSTOMER_ACTIVATED)..."
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchLogs()}
            className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-black"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-black border-t-transparent" />
          <p className="mt-3 text-xs font-semibold text-gray-400">Loading audit trail records...</p>
        </div>
      ) : (
        <>
          <AdminTable
            data={logs}
            columns={columns}
            searchKeys={["description", "action", "entityType"]}
          />

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-bold hover:border-black disabled:opacity-40"
              >
                Previous
              </button>
              <span className="flex items-center px-2 text-xs font-bold text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-bold hover:border-black disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default AuditLogPage;
