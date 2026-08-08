import { useEffect, useState } from "react";
import { Link } from "react-router";
import { adminApi, type BackendCustomerItem } from "../../services/admin-api";
import { formatPrice } from "../../utils/formatPrice";
import AdminTable, { type Column } from "../../components/admin/AdminTable";

export function CustomerListPage() {
  const [customers, setCustomers] = useState<BackendCustomerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionMessage, setActionMessage] = useState("");

  const fetchCustomers = () => {
    setLoading(true);
    adminApi
      .getCustomers({
        search: search.trim() || undefined,
        isActive: statusFilter === "all" ? undefined : statusFilter,
        page,
        limit: 15,
      })
      .then((res) => {
        setCustomers(res.data);
        setTotalPages(res.meta.totalPages);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCustomers();
  }, [statusFilter, page]);

  const handleToggleStatus = async (customer: BackendCustomerItem) => {
    setActionMessage("");
    try {
      await adminApi.updateCustomerStatus(customer.id, !customer.isActive);
      setActionMessage(`Customer "${customer.fullName}" status updated.`);
      fetchCustomers();
    } catch (err: unknown) {
      const msg = typeof err === "object" && err !== null && "message" in err
        ? (err as { message: string }).message
        : "Failed to update customer status.";
      setActionMessage(`⚠ ${msg}`);
    }
  };

  const columns: Column<BackendCustomerItem>[] = [
    {
      header: "Customer Name",
      accessor: (row) => (
        <div>
          <p className="font-bold text-gray-900">{row.fullName}</p>
          <p className="text-xs text-gray-400">Registered {new Date(row.createdAt).toLocaleDateString("en-PK")}</p>
        </div>
      ),
      sortable: true,
    },
    {
      header: "Email Address",
      accessor: "email",
      sortable: true,
    },
    {
      header: "Phone Number",
      accessor: (row) => row.phone || "—",
    },
    {
      header: "Status",
      accessor: (row) => (
        <span
          className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-bold ${
            row.isActive ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
          }`}
        >
          {row.isActive ? "Active" : "Deactivated"}
        </span>
      ),
      sortable: true,
    },
    {
      header: "Orders Count",
      accessor: (row) => `${row.orderCount} ${row.orderCount === 1 ? "order" : "orders"}`,
      sortable: true,
    },
    {
      header: "Total Spent",
      accessor: (row) => <span className="font-bold text-gray-900">{formatPrice(row.totalSpent)}</span>,
      sortable: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-gray-950 tracking-tight">Customer Directory</h1>
          <p className="text-xs text-gray-500 font-medium">Manage registered customers, order history, and account status.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search name, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchCustomers()}
            className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-black"
          />

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold outline-none focus:border-black cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="true">Active Only</option>
            <option value="false">Deactivated Only</option>
          </select>
        </div>
      </div>

      {actionMessage && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-semibold text-emerald-800">
          {actionMessage}
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-black border-t-transparent" />
          <p className="mt-3 text-xs font-semibold text-gray-400">Loading customer records...</p>
        </div>
      ) : (
        <>
          <AdminTable
            data={customers}
            columns={columns}
            searchKeys={["fullName", "email"]}
            actions={(row) => (
              <div className="flex items-center gap-2">
                <Link
                  to={`/admin/customers/${row.id}`}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1 text-xs font-bold text-gray-900 hover:border-black transition"
                >
                  View Detail
                </Link>

                <button
                  type="button"
                  onClick={() => handleToggleStatus(row)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                    row.isActive
                      ? "border border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                      : "border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  }`}
                >
                  {row.isActive ? "Deactivate" : "Activate"}
                </button>
              </div>
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

export default CustomerListPage;
