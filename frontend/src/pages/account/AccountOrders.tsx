import { useEffect, useState } from "react";
import { Link } from "react-router";
import { orderApi } from "../../services/order-api";
import type { BackendOrder, OrderStatus } from "../../types/order";
import { formatPrice } from "../../utils/formatPrice";

export function AccountOrders() {
  const [orders, setOrders] = useState<BackendOrder[]>([]);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "ALL">("ALL");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const filterStatus = statusFilter === "ALL" ? undefined : statusFilter;

    orderApi
      .getCustomerOrders({ status: filterStatus, page, limit: 10 })
      .then((res) => {
        if (isMounted) {
          setOrders(res.data);
          setTotalPages(res.meta.totalPages);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [statusFilter, page]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-950">My Orders</h2>
          <p className="text-xs font-semibold text-gray-500 mt-1">
            Track, view details, or manage your recent purchases.
          </p>
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as any);
            setPage(1);
          }}
          className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-800 outline-none focus:border-black"
        >
          <option value="ALL">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="PROCESSING">Processing</option>
          <option value="SHIPPED">Shipped</option>
          <option value="DELIVERED">Delivered</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-black border-t-transparent" />
          <p className="mt-3 text-xs font-semibold text-gray-400">Loading orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center space-y-3">
          <p className="text-base font-bold text-gray-900">No orders found</p>
          <p className="text-xs text-gray-500">You haven't placed any orders yet or matching the selected filter.</p>
          <Link
            to="/shop"
            className="inline-block mt-4 rounded-xl bg-black px-5 py-2.5 text-xs font-bold text-white hover:bg-gray-800 transition"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((ord) => (
            <article
              key={ord.id}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs transition hover:shadow-sm space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
                <div>
                  <span className="font-mono text-xs font-bold text-gray-950">{ord.orderNumber}</span>
                  <p className="text-[11px] text-gray-400 font-semibold mt-0.5">
                    Placed on {new Date(ord.createdAt).toLocaleDateString("en-PK", { year: "numeric", month: "short", day: "numeric" })}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                      ord.status === "DELIVERED"
                        ? "bg-emerald-100 text-emerald-800"
                        : ord.status === "CANCELLED"
                        ? "bg-rose-100 text-rose-800 border border-rose-200"
                        : ord.status === "SHIPPED"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {ord.status}
                  </span>

                  <span
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                      ord.status === "CANCELLED"
                        ? ord.paymentStatus === "PAID" || ord.paymentStatus === "REFUNDED"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-gray-100 text-gray-600 border border-gray-200"
                        : ord.paymentStatus === "PAID"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {ord.status === "CANCELLED"
                      ? ord.paymentStatus === "PAID" || ord.paymentStatus === "REFUNDED"
                        ? "Payment: Refunded"
                        : "Payment: Voided"
                      : `Payment: ${ord.paymentStatus}`}
                  </span>
                </div>
              </div>

              {/* Items summary */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-gray-900">
                    {ord.items.length} {ord.items.length === 1 ? "Item" : "Items"}{" "}
                    {ord.status === "CANCELLED" && (
                      <span className="text-[11px] font-semibold text-rose-700">(Order Cancelled)</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 line-clamp-1">
                    {ord.items.map((i) => i.productNameSnapshot).join(", ")}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-gray-400">
                      {ord.status === "CANCELLED" ? "Amount Due" : "Total Amount"}
                    </p>
                    {ord.status === "CANCELLED" ? (
                      <div className="flex items-center gap-1.5 justify-end">
                        <span className="text-xs text-gray-400 line-through font-semibold">
                          {formatPrice(Number(ord.total))}
                        </span>
                        <span className="text-sm font-extrabold text-emerald-700">Rs 0</span>
                      </div>
                    ) : (
                      <p className="text-sm font-extrabold text-gray-950">{formatPrice(Number(ord.total))}</p>
                    )}
                  </div>

                  <Link
                    to={`/account/orders/${ord.id}`}
                    className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-bold text-gray-900 hover:border-black transition"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </article>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-4">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-bold hover:border-black disabled:opacity-40"
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
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-bold hover:border-black disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AccountOrders;
