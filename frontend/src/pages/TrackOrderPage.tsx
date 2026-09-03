import { useState, type FormEvent } from "react";
import { orderApi } from "../services/order-api";
import type { PublicOrderTrackingResult } from "../types/order";
import { AlertIcon } from "../components/common/Icons";

export function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [verificationInput, setVerificationInput] = useState("");
  const [trackingResult, setTrackingResult] = useState<PublicOrderTrackingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleTrackSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setTrackingResult(null);

    if (!orderNumber.trim()) {
      setError("Please enter your Order Number.");
      return;
    }
    if (!verificationInput.trim()) {
      setError("Please enter your matching Email or Phone Number.");
      return;
    }

    setLoading(true);
    try {
      const res = await orderApi.trackOrderPublic(orderNumber, verificationInput);
      setTrackingResult(res);
    } catch (err: unknown) {
      const msg = typeof err === "object" && err !== null && "message" in err
        ? (err as { message: string }).message
        : "Order tracking details not found or verification failed.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:px-6 space-y-8">
      {/* Title */}
      <div className="text-center space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Order Tracking</p>
        <h1 className="text-3xl font-extrabold text-gray-950">Track Your Shipment</h1>
        <p className="text-xs font-semibold text-gray-500 max-w-md mx-auto">
          Enter your Order Number along with the matching email or phone number used during checkout.
        </p>
      </div>

      {/* Tracking Search Form */}
      <form onSubmit={handleTrackSubmit} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        {error && (
          <div className="flex items-center gap-1.5 rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-semibold text-red-700">
            <AlertIcon className="h-4 w-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
              Order Number *
            </label>
            <input
              type="text"
              placeholder="e.g. ORD-12345-6789"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              required
              className="w-full rounded-xl border border-gray-300 p-3 text-xs font-medium focus:border-black outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
              Matching Email / Phone *
            </label>
            <input
              type="text"
              placeholder="Email address or Phone number"
              value={verificationInput}
              onChange={(e) => setVerificationInput(e.target.value)}
              required
              className="w-full rounded-xl border border-gray-300 p-3 text-xs font-medium focus:border-black outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-black py-3.5 text-xs font-bold text-white hover:bg-gray-800 transition disabled:bg-gray-300 cursor-pointer"
        >
          {loading ? "Searching..." : "Track Shipment"}
        </button>
      </form>

      {/* Safe Public Tracking Result Display */}
      {trackingResult && (
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-150 pb-4">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Order Reference</p>
              <h2 className="text-lg font-extrabold text-gray-950 font-mono">{trackingResult.orderNumber}</h2>
              <p className="text-[11px] text-gray-500 font-semibold mt-0.5">
                Placed: {new Date(trackingResult.createdAt).toLocaleDateString("en-PK")}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`rounded-lg px-3 py-1 text-xs font-bold ${
                  trackingResult.status === "CANCELLED"
                    ? "bg-rose-100 text-rose-800 border border-rose-200"
                    : trackingResult.status === "DELIVERED"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-black text-white"
                }`}
              >
                {trackingResult.status}
              </span>
              <span className="rounded-lg bg-gray-100 border border-gray-200 px-3 py-1 text-xs font-bold text-gray-800">
                {trackingResult.status === "CANCELLED"
                  ? trackingResult.paymentStatus === "PAID" || trackingResult.paymentStatus === "REFUNDED"
                    ? "Payment: Refunded"
                    : "Payment: Voided"
                  : `Payment: ${trackingResult.paymentStatus}`}
              </span>
            </div>
          </div>

          {/* Cancelled Notice */}
          {trackingResult.status === "CANCELLED" && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-900 font-medium">
              <p className="font-bold text-rose-950">Shipment Cancelled</p>
              <p className="mt-0.5 text-rose-800/90 text-[11px]">
                This order was cancelled and is no longer in transit. Reserved items were returned to inventory and any applicable charges voided.
              </p>
            </div>
          )}

          {/* Timeline */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Status Timeline</h3>
            <div className="space-y-3">
              {trackingResult.timeline.map((h, idx) => {
                const isStepCancelled = h.status === "CANCELLED";
                const isStepDelivered = h.status === "DELIVERED";

                return (
                  <div key={idx} className="flex items-start gap-3 text-xs">
                    <div
                      className={`mt-1 h-3 w-3 rounded-full shrink-0 ${
                        isStepCancelled ? "bg-rose-600" : isStepDelivered ? "bg-emerald-600" : "bg-black"
                      }`}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span
                          className={`font-bold ${
                            isStepCancelled
                              ? "text-rose-700 font-extrabold"
                              : isStepDelivered
                              ? "text-emerald-800"
                              : "text-gray-950"
                          }`}
                        >
                          {h.status}
                        </span>
                        <span className="text-gray-400 text-[11px]">
                          {new Date(h.timestamp).toLocaleString("en-PK")}
                        </span>
                      </div>
                      {h.note && <p className="text-gray-500 font-medium mt-0.5">{h.note}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Safe Items Summary */}
          <div className="border-t border-gray-150 pt-4 space-y-2">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Items Summary ({trackingResult.itemCount})</h3>
            <div className="divide-y divide-gray-100">
              {trackingResult.itemsSummary.map((item, idx) => (
                <div key={idx} className="py-2 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-gray-950">{item.productName}</p>
                    <p className="text-gray-400 text-[11px]">SKU: {item.sku} {item.size ? `· Size: ${item.size}` : ""}</p>
                  </div>
                  <span className="font-semibold text-gray-700">Qty: {item.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

export default TrackOrderPage;
