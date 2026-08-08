import { useEffect, useState } from "react";
import { Link } from "react-router";
import { returnApi } from "../../services/return-api";
import type { ReturnRequestItem, ReturnRequestStatus, ReturnRequestType } from "../../types/return";
import AdminTable, { type Column } from "../../components/admin/AdminTable";
import AdminStatusBadge from "../../components/admin/AdminStatusBadge";

export function ReturnsPage() {
  const [requests, setRequests] = useState<ReturnRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchRequests = () => {
    setLoading(true);
    const filterStatus = statusFilter === "All" ? undefined : (statusFilter.toUpperCase() as ReturnRequestStatus);
    const filterType = typeFilter === "All" ? undefined : (typeFilter.toUpperCase() as ReturnRequestType);

    returnApi
      .getAdminReturns({
        search: search.trim() || undefined,
        status: filterStatus,
        type: filterType,
        page,
        limit: 15,
      })
      .then((res) => {
        setRequests(res.data);
        setTotalPages(res.meta.totalPages);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter, typeFilter, page]);

  const columns: Column<ReturnRequestItem>[] = [
    {
      header: "Request #",
      accessor: (row) => <span className="font-mono font-bold text-gray-950">{row.requestNumber}</span>,
      sortable: true,
    },
    {
      header: "Order #",
      accessor: (row) => <span className="font-mono text-gray-600">{row.order?.orderNumber}</span>,
      sortable: true,
    },
    {
      header: "Customer",
      accessor: (row) => (
        <div>
          <p className="font-semibold text-gray-900">{row.user?.fullName}</p>
          <p className="text-xs text-gray-400">{row.user?.email}</p>
        </div>
      ),
      sortable: true,
    },
    {
      header: "Type",
      accessor: (row) => <span className="font-bold text-xs uppercase text-gray-700">{row.type}</span>,
      sortable: true,
    },
    {
      header: "Status",
      accessor: (row) => <AdminStatusBadge status={row.status} />,
      sortable: true,
    },
    {
      header: "Date",
      accessor: (row) => new Date(row.createdAt).toLocaleDateString("en-PK", { dateStyle: "medium" }),
      sortable: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-gray-950 tracking-tight">Returns & Exchanges</h1>
          <p className="text-xs text-gray-500 font-medium">Manage return workflows, replacements, and stock restoration.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search request #, order #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchRequests()}
            className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-black"
          />

          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold outline-none focus:border-black cursor-pointer"
          >
            <option value="All">All Types</option>
            <option value="RETURN">Return</option>
            <option value="EXCHANGE">Exchange</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold outline-none focus:border-black cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="REQUESTED">Requested</option>
            <option value="APPROVED">Approved</option>
            <option value="RECEIVED">Received</option>
            <option value="COMPLETED">Completed</option>
            <option value="REJECTED">Rejected</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-black border-t-transparent" />
          <p className="mt-3 text-xs font-semibold text-gray-400">Loading return requests...</p>
        </div>
      ) : (
        <>
          <AdminTable
            data={requests}
            columns={columns}
            searchKeys={["requestNumber", "reason"]}
            actions={(row) => (
              <Link
                to={`/admin/returns/${row.id}`}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1 text-xs font-bold text-gray-900 hover:border-black transition"
              >
                View Request
              </Link>
            )}
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

export default ReturnsPage;
