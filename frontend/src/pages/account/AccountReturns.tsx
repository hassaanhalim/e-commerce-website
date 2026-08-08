import { useEffect, useState } from "react";
import { Link } from "react-router";
import { returnApi } from "../../services/return-api";
import type { ReturnRequestItem } from "../../types/return";
import { formatPrice } from "../../utils/formatPrice";

export function AccountReturns() {
  const [requests, setRequests] = useState<ReturnRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionMessage, setActionMessage] = useState("");

  const fetchRequests = () => {
    setLoading(true);
    returnApi
      .getMyReturnRequests({ page, limit: 10 })
      .then((res) => {
        setRequests(res.data);
        setTotalPages(res.meta.totalPages);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRequests();
  }, [page]);

  const handleCancelRequest = async (id: string) => {
    setActionMessage("");
    try {
      await returnApi.cancelCustomerReturn(id);
      setActionMessage("Return request cancelled successfully.");
      fetchRequests();
    } catch (err: unknown) {
      const msg = typeof err === "object" && err !== null && "message" in err
        ? (err as { message: string }).message
        : "Failed to cancel request.";
      setActionMessage(`⚠ ${msg}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-2xl font-extrabold text-gray-950">My Returns & Exchanges</h2>
        <p className="text-xs font-semibold text-gray-500 mt-1">
          Track return and replacement request statuses and refund details.
        </p>
      </div>

      {actionMessage && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-semibold text-emerald-800">
          {actionMessage}
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-black border-t-transparent" />
          <p className="mt-3 text-xs font-semibold text-gray-400">Loading return requests...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center space-y-3">
          <p className="text-base font-bold text-gray-900">No return requests</p>
          <p className="text-xs text-gray-500">You haven't requested any returns or exchanges.</p>
          <Link
            to="/account/orders"
            className="inline-block mt-4 rounded-xl bg-black px-5 py-2.5 text-xs font-bold text-white hover:bg-gray-800 transition"
          >
            View Orders
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <article key={req.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
                <div>
                  <span className="font-mono text-xs font-bold text-gray-950">{req.requestNumber}</span>
                  <p className="text-[11px] text-gray-400 font-semibold mt-0.5">
                    Order: {req.order?.orderNumber || "Order"} · {new Date(req.createdAt).toLocaleDateString("en-PK")}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-700 uppercase">
                    {req.type}
                  </span>
                  <span
                    className={`rounded-md px-2.5 py-1 text-xs font-bold ${
                      req.status === "COMPLETED"
                        ? "bg-emerald-100 text-emerald-800"
                        : req.status === "REJECTED" || req.status === "CANCELLED"
                        ? "bg-red-100 text-red-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {req.status}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-gray-900">{req.orderItem?.productNameSnapshot || "Item"}</p>
                  <p className="text-gray-500 text-[11px]">Reason: {req.reason} · Qty: {req.quantity}</p>
                  {req.replacementVariant && (
                    <p className="text-emerald-700 text-[11px] font-semibold mt-0.5">
                      Replacement: Size {req.replacementVariant.size} · Color {req.replacementVariant.color}
                    </p>
                  )}
                </div>

                {req.refundAmount > 0 && (
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Refund Amount</p>
                    <p className="font-extrabold text-sm text-emerald-700">{formatPrice(Number(req.refundAmount))}</p>
                  </div>
                )}
              </div>

              {req.status === "REQUESTED" && (
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleCancelRequest(req.id)}
                    className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-[11px] font-bold text-red-700 hover:bg-red-100 transition cursor-pointer"
                  >
                    Cancel Request
                  </button>
                </div>
              )}
            </article>
          ))}

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

export default AccountReturns;
