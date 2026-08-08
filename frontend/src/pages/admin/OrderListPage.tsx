import { useEffect, useState } from "react";
import { Link } from "react-router";
import { orderApi } from "../../services/order-api";
import type { BackendOrder, OrderStatus } from "../../types/order";
import { formatPrice } from "../../utils/formatPrice";
import AdminTable, { type Column } from "../../components/admin/AdminTable";
import AdminStatusBadge from "../../components/admin/AdminStatusBadge";

export function OrderListPage() {
  const [orders, setOrders] = useState<BackendOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchOrders = () => {
    setLoading(true);
    const filterStatus = statusFilter === "All" ? undefined : (statusFilter.toUpperCase() as OrderStatus);

    orderApi
      .getAdminOrders({
        search: search.trim() || undefined,
        status: filterStatus,
        page,
        limit: 15,
      })
      .then((res) => {
        setOrders(res.data);
        setTotalPages(res.meta.totalPages);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchOrders();
  };

  const columns: Column<BackendOrder>[] = [
    {
      header: "Order Number",
      accessor: (row) => <span className="font-mono font-bold text-gray-950">{row.orderNumber}</span>,
      sortable: true,
    },
    {
      header: "Date",
      accessor: (row) => new Date(row.createdAt).toLocaleDateString("en-PK", { dateStyle: "medium" }),
      sortable: true,
    },
    {
      header: "Customer",
      accessor: (row) => (
        <div>
          <p className="font-semibold text-gray-900">{row.user?.fullName || row.shippingAddressSnapshot?.recipientName}</p>
          <p className="text-xs text-gray-400">{row.customerEmail}</p>
        </div>
      ),
      sortable: true,
    },
    {
      header: "Items",
      accessor: (row) => {
        const count = row.items.reduce((sum, item) => sum + item.quantity, 0);
        return `${count} ${count === 1 ? "item" : "items"}`;
      },
    },
    {
      header: "Total",
      accessor: (row) => <span className="font-bold text-gray-900">{formatPrice(Number(row.total))}</span>,
      sortable: true,
    },
    {
      header: "Payment Method",
      accessor: (row) => (
        <span className="text-xs font-semibold">
          {row.paymentMethod === "CASH_ON_DELIVERY" ? "COD" : "Mock Online"}
        </span>
      ),
    },
    {
      header: "Status",
      accessor: (row) => <AdminStatusBadge status={row.status} />,
      sortable: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-gray-950 tracking-tight">Order Logs</h1>
          <p className="text-xs text-gray-500 font-medium">Manage customer orders, statuses, and inventory conversion.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <form onSubmit={handleSearchSubmit} className="flex items-center">
            <input
              type="text"
              placeholder="Search order #, email, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium outline-none focus:border-black"
            />
            <button
              type="submit"
              className="ml-2 rounded-xl bg-black px-3 py-1.5 text-xs font-bold text-white hover:bg-gray-800 transition"
            >
              Search
            </button>
          </form>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold outline-none focus:border-black cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PROCESSING">Processing</option>
            <option value="SHIPPED">Shipped</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-black border-t-transparent" />
          <p className="mt-3 text-xs font-semibold text-gray-400">Loading admin orders...</p>
        </div>
      ) : (
        <>
          <AdminTable
            data={orders}
            columns={columns}
            searchKeys={["orderNumber", "customerEmail"]}
            actions={(row) => (
              <Link
                to={`/admin/orders/${row.id}`}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1 text-xs font-bold text-gray-900 hover:border-black transition"
              >
                View
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

export default OrderListPage;
