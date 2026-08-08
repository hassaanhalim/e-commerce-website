import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { orderApi } from "../../services/order-api";
import { reviewApi } from "../../services/review-api";
import { returnApi } from "../../services/return-api";
import { catalogApi, type ProductDetailResponse } from "../../services/catalog-api";
import type { BackendOrder } from "../../types/order";
import type { ReturnRequestType } from "../../types/return";
import { formatPrice } from "../../utils/formatPrice";

export function AccountOrderDetail() {
  const { orderId } = useParams<{ orderId: string }>();

  const [order, setOrder] = useState<BackendOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // Cancel Modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  // Review Modal state
  const [reviewItem, setReviewItem] = useState<{ id: string; productName: string } | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Return / Exchange Modal state
  const [returnItem, setReturnItem] = useState<{
    id: string;
    productName: string;
    productId: string;
    unitPrice: number;
    maxQty: number;
  } | null>(null);
  const [returnType, setReturnType] = useState<ReturnRequestType>("RETURN");
  const [returnQty, setReturnQty] = useState(1);
  const [returnReason, setReturnReason] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [productCatalog, setProductCatalog] = useState<ProductDetailResponse | null>(null);
  const [selectedReplacementVariantId, setSelectedReplacementVariantId] = useState("");
  const [submittingReturn, setSubmittingReturn] = useState(false);

  const fetchOrder = () => {
    if (!orderId) return;
    setLoading(true);
    orderApi
      .getCustomerOrderById(orderId)
      .then((data) => setOrder(data))
      .catch((err: unknown) => {
        const msg = typeof err === "object" && err !== null && "message" in err
          ? (err as { message: string }).message
          : "Order not found.";
        setError(msg);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  // Load product catalog for replacement variant selection if exchange
  useEffect(() => {
    if (returnItem && returnType === "EXCHANGE") {
      catalogApi
        .getProductBySlug(returnItem.productId)
        .then((prod) => setProductCatalog(prod))
        .catch(() => {});
    }
  }, [returnItem, returnType]);

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-black border-t-transparent" />
        <p className="mt-3 text-xs font-semibold text-gray-400">Loading order details...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center space-y-3">
        <p className="text-base font-bold text-gray-900">Order Not Found</p>
        <p className="text-xs text-gray-500">{error || "The requested order could not be retrieved."}</p>
        <Link to="/account/orders" className="inline-block mt-4 rounded-xl bg-black px-5 py-2.5 text-xs font-bold text-white">
          Return to Orders
        </Link>
      </div>
    );
  }

  const isEligibleForCancellation = order.status === "PENDING" || order.status === "CONFIRMED";
  const isDelivered = order.status === "DELIVERED";

  const handleCancelOrder = async () => {
    setCancelling(true);
    setError("");
    setActionSuccess("");
    try {
      const updated = await orderApi.cancelCustomerOrder(order.id, cancelReason);
      setOrder(updated);
      setShowCancelModal(false);
      setActionSuccess("Order has been cancelled successfully. Inventory restored.");
    } catch (err: unknown) {
      const msg = typeof err === "object" && err !== null && "message" in err
        ? (err as { message: string }).message
        : "Failed to cancel order.";
      setError(msg);
    } finally {
      setCancelling(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewItem) return;
    setSubmittingReview(true);
    setError("");
    setActionSuccess("");
    try {
      await reviewApi.createReview({
        orderItemId: reviewItem.id,
        rating: reviewRating,
        title: reviewTitle,
        comment: reviewComment,
      });
      setReviewItem(null);
      setReviewTitle("");
      setReviewComment("");
      setActionSuccess("Thank you! Your review has been submitted for moderation.");
    } catch (err: unknown) {
      const msg = typeof err === "object" && err !== null && "message" in err
        ? (err as { message: string }).message
        : "Failed to submit review.";
      setError(msg);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleSubmitReturn = async () => {
    if (!returnItem) return;
    setSubmittingReturn(true);
    setError("");
    setActionSuccess("");
    try {
      await returnApi.createReturnRequest({
        orderItemId: returnItem.id,
        type: returnType,
        quantity: returnQty,
        reason: returnReason,
        customerNotes,
        replacementVariantId: returnType === "EXCHANGE" ? selectedReplacementVariantId : undefined,
      });
      setReturnItem(null);
      setReturnReason("");
      setCustomerNotes("");
      setSelectedReplacementVariantId("");
      setActionSuccess(`${returnType === "RETURN" ? "Return" : "Exchange"} request submitted successfully!`);
    } catch (err: unknown) {
      const msg = typeof err === "object" && err !== null && "message" in err
        ? (err as { message: string }).message
        : "Failed to submit return request.";
      setError(msg);
    } finally {
      setSubmittingReturn(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <Link to="/account/orders" className="text-xs font-bold text-gray-400 hover:text-black transition">
            ← Back to My Orders
          </Link>
          <h2 className="text-2xl font-extrabold text-gray-950 mt-1">
            Order <span className="font-mono text-gray-900">{order.orderNumber}</span>
          </h2>
          <p className="text-xs font-semibold text-gray-500">
            Placed on {new Date(order.createdAt).toLocaleString("en-PK")}
          </p>
        </div>

        {isEligibleForCancellation && (
          <button
            type="button"
            onClick={() => setShowCancelModal(true)}
            className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-100 transition cursor-pointer"
          >
            Cancel Order
          </button>
        )}
      </div>

      {actionSuccess && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-semibold text-emerald-800">
          ✓ {actionSuccess}
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-xs font-semibold text-red-700">
          ⚠ {error}
        </div>
      )}

      {/* Main Details Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Status Timeline & Items */}
        <div className="md:col-span-2 space-y-6">
          {/* Status Timeline */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Order Status Timeline</h3>
            <div className="space-y-3">
              {order.statusHistory?.map((history) => (
                <div key={history.id} className="flex items-start gap-3 text-xs">
                  <div className="mt-1 h-3 w-3 rounded-full bg-black shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-950">{history.toStatus}</span>
                      <span className="text-gray-400 text-[11px]">{new Date(history.createdAt).toLocaleString("en-PK")}</span>
                    </div>
                    {history.note && <p className="text-gray-600 font-medium mt-0.5">{history.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ordered Items with Action Controls */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ordered Items</h3>

            <div className="divide-y divide-gray-150">
              {order.items.map((item) => (
                <div key={item.id} className="py-4 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      {item.imageSnapshot && (
                        <img src={item.imageSnapshot} alt={item.productNameSnapshot} className="h-12 w-12 rounded-lg object-cover bg-gray-50 border border-gray-200 shrink-0" />
                      )}
                      <div>
                        <p className="font-bold text-gray-950">{item.productNameSnapshot}</p>
                        <p className="text-gray-500 text-[11px]">
                          SKU: {item.skuSnapshot} {item.sizeSnapshot ? `· Size: ${item.sizeSnapshot}` : ""} {item.colorSnapshot ? `· Color: ${item.colorSnapshot}` : ""}
                        </p>
                      </div>
                    </div>
                    <span className="font-bold text-gray-950">{formatPrice(Number(item.lineTotal))}</span>
                  </div>

                  {/* Actions for delivered order items */}
                  {isDelivered && (
                    <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() => setReviewItem({ id: item.id, productName: item.productNameSnapshot })}
                        className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-1.5 text-[11px] font-bold text-gray-800 hover:border-black transition cursor-pointer"
                      >
                        ★ Write Review
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setReturnItem({
                            id: item.id,
                            productName: item.productNameSnapshot,
                            productId: item.productId,
                            unitPrice: Number(item.unitPrice),
                            maxQty: item.quantity,
                          });
                          setReturnType("RETURN");
                          setReturnQty(1);
                        }}
                        className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-1.5 text-[11px] font-bold text-gray-800 hover:border-black transition cursor-pointer"
                      >
                        ↩ Request Return / Exchange
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar: Address & Payment Info */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-3 text-xs font-medium">
            <h3 className="font-bold text-gray-400 uppercase tracking-wider">Payment Information</h3>
            <div className="flex justify-between">
              <span className="text-gray-500">Method</span>
              <span className="font-bold text-gray-900">{order.paymentMethod === "CASH_ON_DELIVERY" ? "COD" : "Mock Online"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Status</span>
              <span className={`font-bold rounded px-1.5 py-0.5 text-[10px] ${
                order.paymentStatus === "PAID" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
              }`}>
                {order.paymentStatus}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-2 text-xs">
            <h3 className="font-bold text-gray-400 uppercase tracking-wider">Shipping Address</h3>
            <p className="font-bold text-gray-950 text-sm">{order.shippingAddressSnapshot.recipientName}</p>
            <p className="text-gray-600">{order.shippingAddressSnapshot.addressLine1}</p>
            <p className="text-gray-500">{order.shippingAddressSnapshot.city}, {order.shippingAddressSnapshot.country}</p>
            <p className="text-gray-400">📞 {order.shippingAddressSnapshot.phone}</p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 shadow-xs space-y-2 text-xs font-semibold text-gray-600">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatPrice(Number(order.subtotal))}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span>{formatPrice(Number(order.shippingAmount))}</span>
            </div>
            <div className="border-t border-gray-200 pt-3 flex justify-between text-sm font-extrabold text-gray-950">
              <span>Total</span>
              <span className="text-base">{formatPrice(Number(order.total))}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {reviewItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-extrabold text-gray-950">Review Item</h3>
              <button type="button" onClick={() => setReviewItem(null)} className="text-gray-400 hover:text-black">✕</button>
            </div>
            <p className="text-xs font-bold text-gray-700">{reviewItem.productName}</p>

            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase text-gray-400">Rating *</label>
              <div className="flex gap-2 text-2xl text-amber-400">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className="hover:scale-110 transition cursor-pointer"
                  >
                    {star <= reviewRating ? "★" : "☆"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase text-gray-400">Review Title (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Extremely comfortable shoes!"
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
                className="w-full rounded-xl border border-gray-300 p-2.5 text-xs font-medium focus:border-black outline-none mt-1"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase text-gray-400">Detailed Feedback *</label>
              <textarea
                rows={4}
                placeholder="Write your honest review..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                required
                className="w-full rounded-xl border border-gray-300 p-2.5 text-xs font-medium focus:border-black outline-none mt-1"
              />
            </div>

            <button
              type="button"
              onClick={handleSubmitReview}
              disabled={submittingReview || !reviewComment.trim()}
              className="w-full rounded-xl bg-black py-3 text-xs font-bold text-white hover:bg-gray-800 disabled:opacity-50 cursor-pointer"
            >
              {submittingReview ? "Submitting..." : "Submit Review"}
            </button>
          </div>
        </div>
      )}

      {/* Return / Exchange Modal */}
      {returnItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-extrabold text-gray-950">Return / Exchange Request</h3>
              <button type="button" onClick={() => setReturnItem(null)} className="text-gray-400 hover:text-black">✕</button>
            </div>
            <p className="text-xs font-bold text-gray-700">{returnItem.productName}</p>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setReturnType("RETURN")}
                className={`py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
                  returnType === "RETURN" ? "border-black bg-black text-white" : "border-gray-300 text-gray-700"
                }`}
              >
                Return for Refund
              </button>

              <button
                type="button"
                onClick={() => setReturnType("EXCHANGE")}
                className={`py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
                  returnType === "EXCHANGE" ? "border-black bg-black text-white" : "border-gray-300 text-gray-700"
                }`}
              >
                Exchange Size / Color
              </button>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase text-gray-400">Quantity *</label>
              <select
                value={returnQty}
                onChange={(e) => setReturnQty(Number(e.target.value))}
                className="w-full rounded-xl border border-gray-300 p-2 text-xs font-semibold outline-none mt-1"
              >
                {Array.from({ length: returnItem.maxQty }, (_, i) => i + 1).map((q) => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>
            </div>

            {returnType === "EXCHANGE" && productCatalog && (
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-gray-400">Select Replacement Variant *</label>
                <select
                  value={selectedReplacementVariantId}
                  onChange={(e) => setSelectedReplacementVariantId(e.target.value)}
                  required
                  className="w-full rounded-xl border border-gray-300 p-2 text-xs font-semibold outline-none mt-1"
                >
                  <option value="">-- Choose Replacement Size & Color --</option>
                  {productCatalog.variants
                    .filter((v) => v.inStock && v.isActive && Math.abs(v.effectivePrice - returnItem.unitPrice) < 0.01)
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        Size {v.size} · Color {v.color} (SKU: {v.sku})
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div>
              <label className="text-[11px] font-bold uppercase text-gray-400">Reason *</label>
              <input
                type="text"
                placeholder="e.g. Size too small / Defective / Disliked color"
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                required
                className="w-full rounded-xl border border-gray-300 p-2.5 text-xs font-medium outline-none mt-1"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase text-gray-400">Additional Customer Notes</label>
              <textarea
                rows={3}
                placeholder="Provide any additional details..."
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                className="w-full rounded-xl border border-gray-300 p-2.5 text-xs font-medium outline-none mt-1"
              />
            </div>

            <button
              type="button"
              onClick={handleSubmitReturn}
              disabled={submittingReturn || !returnReason.trim() || (returnType === "EXCHANGE" && !selectedReplacementVariantId)}
              className="w-full rounded-xl bg-black py-3 text-xs font-bold text-white hover:bg-gray-800 disabled:opacity-50 cursor-pointer"
            >
              {submittingReturn ? "Submitting Request..." : "Submit Request"}
            </button>
          </div>
        </div>
      )}

      {/* Cancellation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-lg font-extrabold text-gray-950">Cancel Order</h3>
            <p className="text-xs text-gray-500 font-medium">
              Are you sure you want to cancel order <span className="font-mono font-bold text-gray-950">{order.orderNumber}</span>?
            </p>

            <textarea
              rows={3}
              placeholder="Reason for cancellation (optional)..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full rounded-xl border border-gray-300 p-3 text-xs font-medium outline-none"
            />

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-bold text-gray-700 hover:border-black"
              >
                Keep Order
              </button>

              <button
                type="button"
                onClick={handleCancelOrder}
                disabled={cancelling}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {cancelling ? "Cancelling..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AccountOrderDetail;
