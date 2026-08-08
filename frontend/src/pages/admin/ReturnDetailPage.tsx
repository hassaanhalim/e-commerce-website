import { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import { returnApi } from "../../services/return-api";
import type { ReturnRequestItem, ReturnRequestStatus } from "../../types/return";
import { formatPrice } from "../../utils/formatPrice";
import AdminStatusBadge from "../../components/admin/AdminStatusBadge";

export function ReturnDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [request, setRequest] = useState<ReturnRequestItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [updating, setUpdating] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const fetchRequest = () => {
    if (!id) return;
    setLoading(true);
    returnApi
      .getAdminReturnById(id)
      .then((data) => setRequest(data))
      .catch((err: unknown) => {
        const msg = typeof err === "object" && err !== null && "message" in err
          ? (err as { message: string }).message
          : "Return request not found.";
        setError(msg);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRequest();
  }, [id]);

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-black border-t-transparent" />
        <p className="mt-3 text-xs font-semibold text-gray-400">Loading request details...</p>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center space-y-3">
        <p className="text-base font-bold text-gray-900">Request Not Found</p>
        <p className="text-xs text-gray-500">{error || "The requested return request could not be retrieved."}</p>
        <Link to="/admin/returns" className="inline-block mt-4 rounded-xl bg-black px-5 py-2.5 text-xs font-bold text-white">
          Return to Returns & Exchanges
        </Link>
      </div>
    );
  }

  const handleStatusChange = async (targetStatus: ReturnRequestStatus) => {
    setUpdating(true);
    setError("");
    setSuccessMessage("");
    try {
      const updated = await returnApi.updateReturnStatusByAdmin(request.id, targetStatus, adminNotes);
      setRequest(updated);
      setAdminNotes("");
      setSuccessMessage(`Request status updated to "${targetStatus}".`);
    } catch (err: unknown) {
      const msg = typeof err === "object" && err !== null && "message" in err
        ? (err as { message: string }).message
        : "Failed to update return request status.";
      setError(msg);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/returns"
            className="rounded-xl border border-gray-300 bg-white p-2 text-gray-500 hover:border-black hover:text-black transition"
          >
            ←
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold text-gray-950 font-mono">{request.requestNumber}</h1>
              <AdminStatusBadge status={request.status} />
              <span className="rounded-lg bg-black px-2.5 py-1 text-xs font-bold text-white uppercase">
                {request.type}
              </span>
            </div>
            <p className="mt-1 text-xs font-semibold text-gray-500">
              Submitted on {new Date(request.createdAt).toLocaleString("en-PK")}
            </p>
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-semibold text-emerald-800">
          ✓ {successMessage}
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-xs font-semibold text-red-700">
          ⚠ {error}
        </div>
      )}

      {/* Main Details Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Request Details & Action Controls */}
        <div className="md:col-span-2 space-y-6">
          {/* Status Workflow Action Bar */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Workflow Moderation Actions</h3>

            <div className="space-y-3">
              <label className="text-[11px] font-bold text-gray-500 uppercase">Admin Notes / Audit Note</label>
              <input
                type="text"
                placeholder="Optional notes for customer or audit trail..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="w-full rounded-xl border border-gray-300 p-2.5 text-xs outline-none focus:border-black"
              />

              <div className="flex flex-wrap gap-3 pt-2">
                {request.status === "REQUESTED" && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleStatusChange("APPROVED")}
                      disabled={updating}
                      className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition disabled:opacity-50 cursor-pointer"
                    >
                      ✓ Approve Request
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange("REJECTED")}
                      disabled={updating}
                      className="rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-red-700 transition disabled:opacity-50 cursor-pointer"
                    >
                      ✕ Reject Request
                    </button>
                  </>
                )}

                {request.status === "APPROVED" && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleStatusChange("RECEIVED")}
                      disabled={updating}
                      className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer"
                    >
                      📦 Mark Received
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange("CANCELLED")}
                      disabled={updating}
                      className="rounded-xl bg-gray-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-gray-700 transition disabled:opacity-50 cursor-pointer"
                    >
                      Cancel Request
                    </button>
                  </>
                )}

                {request.status === "RECEIVED" && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange("COMPLETED")}
                    disabled={updating}
                    className="rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-800 transition disabled:opacity-50 cursor-pointer"
                  >
                    ✓ Complete Request & Process Inventory
                  </button>
                )}

                {(request.status === "COMPLETED" || request.status === "REJECTED" || request.status === "CANCELLED") && (
                  <p className="text-xs font-semibold text-gray-500 italic">
                    Request is in final status "{request.status}" and cannot be transitioned further.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Returned Item Information */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-3 text-xs">
            <h3 className="font-bold text-gray-400 uppercase tracking-wider">Returned Item</h3>
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div>
                <p className="font-bold text-gray-950 text-sm">{request.orderItem?.productNameSnapshot}</p>
                <p className="text-gray-500 text-[11px]">SKU: {request.orderItem?.skuSnapshot} · Requested Qty: {request.quantity}</p>
              </div>
              <span className="font-bold text-gray-950">{formatPrice(Number(request.orderItem?.unitPrice))} / unit</span>
            </div>

            <p className="text-gray-600"><span className="font-bold text-gray-700">Reason:</span> {request.reason}</p>
            {request.customerNotes && (
              <p className="text-gray-500"><span className="font-bold text-gray-700">Notes:</span> {request.customerNotes}</p>
            )}
          </div>

          {/* Replacement Variant Information (If EXCHANGE) */}
          {request.type === "EXCHANGE" && request.replacementVariant && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 shadow-xs space-y-2 text-xs">
              <h3 className="font-bold text-emerald-900 uppercase tracking-wider">Replacement Variant Details</h3>
              <p className="font-bold text-gray-950 text-sm">
                {request.replacementVariant.product?.name || request.orderItem?.productNameSnapshot}
              </p>
              <p className="text-gray-700 font-semibold">
                SKU: {request.replacementVariant.sku} · Size: {request.replacementVariant.size} · Color: {request.replacementVariant.color}
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Customer & Financial Information */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-2 text-xs">
            <h3 className="font-bold text-gray-400 uppercase tracking-wider">Customer</h3>
            <p className="font-bold text-gray-950 text-sm">{request.user?.fullName}</p>
            <p className="text-gray-600">{request.user?.email}</p>
            <p className="text-gray-600">{request.user?.phone}</p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-2 text-xs">
            <h3 className="font-bold text-gray-400 uppercase tracking-wider">Order Info</h3>
            <p className="font-mono font-bold text-gray-950">{request.order?.orderNumber}</p>
            <p className="text-gray-600">Order Status: {request.order?.status}</p>
            <p className="text-gray-600">Payment Status: {request.order?.paymentStatus}</p>
          </div>

          {request.type === "RETURN" && (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 shadow-xs space-y-2 text-xs font-semibold text-gray-600">
              <div className="flex justify-between">
                <span>Refund Calculated</span>
                <span className="font-extrabold text-gray-950">{formatPrice(Number(request.refundAmount))}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ReturnDetailPage;
