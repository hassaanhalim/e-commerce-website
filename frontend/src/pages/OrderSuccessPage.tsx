import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { orderApi } from "../services/order-api";
import type { BackendOrder } from "../types/order";
import { formatPrice } from "../utils/formatPrice";
import { CheckIcon, PhoneIcon } from "../components/common/Icons";

export function OrderSuccessPage() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");

  const [order, setOrder] = useState<BackendOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    orderApi
      .getCustomerOrderById(orderId)
      .then((data) => setOrder(data))
      .catch((err: unknown) => {
        const msg = typeof err === "object" && err !== null && "message" in err
          ? (err as { message: string }).message
          : "Order details could not be retrieved.";
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [orderId]);

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-24 text-center">
        <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-black border-t-transparent" />
        <p className="mt-4 text-sm font-semibold text-gray-500">Loading order confirmation...</p>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="mx-auto max-w-md px-6 py-20 text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shadow-sm">
          <CheckIcon className="h-8 w-8 text-emerald-700" />
        </div>
        <h1 className="text-2xl font-bold text-gray-950">Thank You For Your Order!</h1>
        <p className="text-xs text-gray-600 font-medium">Your order has been placed successfully.</p>
        <div className="pt-4 flex justify-center gap-3">
          <Link
            to="/account/orders"
            className="rounded-xl bg-black px-5 py-2.5 text-xs font-bold text-white hover:bg-gray-800 transition"
          >
            View Orders History
          </Link>
          <Link
            to="/shop"
            className="rounded-xl border border-gray-300 px-5 py-2.5 text-xs font-bold text-gray-800 hover:border-black transition"
          >
            Continue Shopping
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:px-6 space-y-8">
      {/* Banner */}
      <div className="rounded-3xl bg-emerald-50 border border-emerald-200 p-8 text-center space-y-3">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
          <CheckIcon className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-extrabold text-emerald-950">Order Placed Successfully!</h1>
        <p className="text-sm font-semibold text-emerald-800">
          Order Number: <span className="font-mono text-emerald-950">{order.orderNumber}</span>
        </p>
        <p className="text-xs text-emerald-700 font-medium">
          A confirmation record has been created for your account. You can track your order status anytime.
        </p>
      </div>

      {/* Summary Card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-6">
        <div className="flex flex-wrap justify-between items-center border-b border-gray-150 pb-4 gap-2">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Order Status</p>
            <span className="inline-block mt-1 rounded-lg bg-gray-900 px-2.5 py-1 text-xs font-bold text-white">
              {order.status}
            </span>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Payment Status</p>
            <span className={`inline-block mt-1 rounded-lg px-2.5 py-1 text-xs font-bold ${
              order.paymentStatus === "PAID"
                ? "bg-emerald-100 text-emerald-800"
                : "bg-amber-100 text-amber-800"
            }`}>
              {order.paymentStatus} ({order.paymentMethod === "CASH_ON_DELIVERY" ? "COD" : "Online"})
            </span>
          </div>
        </div>

        {/* Shipping Address Summary */}
        <div className="space-y-1 text-xs">
          <p className="font-bold text-gray-400 uppercase tracking-wider">Shipping Address</p>
          <p className="font-bold text-gray-950 text-sm">{order.shippingAddressSnapshot.recipientName}</p>
          <p className="text-gray-600 font-medium">{order.shippingAddressSnapshot.addressLine1}</p>
          <p className="text-gray-500">{order.shippingAddressSnapshot.city}, {order.shippingAddressSnapshot.country}</p>
          <p className="text-gray-400 flex items-center gap-1.5">
            <PhoneIcon className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <span>{order.shippingAddressSnapshot.phone}</span>
          </p>
        </div>

        {/* Item Snapshots */}
        <div className="border-t border-gray-150 pt-4 space-y-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ordered Items</p>
          <div className="divide-y divide-gray-100">
            {order.items.map((item) => (
              <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  {item.imageSnapshot && (
                    <img src={item.imageSnapshot} alt={item.productNameSnapshot} className="h-10 w-10 rounded-lg object-cover bg-gray-50 border border-gray-200" />
                  )}
                  <div>
                    <p className="font-bold text-gray-950">{item.productNameSnapshot}</p>
                    <p className="text-gray-500 text-[11px]">SKU: {item.skuSnapshot} · Size: {item.sizeSnapshot} · Qty: {item.quantity}</p>
                  </div>
                </div>
                <span className="font-bold text-gray-950">{formatPrice(Number(item.lineTotal))}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="border-t border-gray-150 pt-4 text-xs font-semibold text-gray-600 space-y-2">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatPrice(Number(order.subtotal))}</span>
          </div>
          <div className="flex justify-between">
            <span>Shipping</span>
            <span>{formatPrice(Number(order.shippingAmount))}</span>
          </div>
          <div className="border-t border-gray-150 pt-3 flex justify-between text-sm font-extrabold text-gray-950">
            <span>Total Paid / Due</span>
            <span className="text-base text-gray-950">{formatPrice(Number(order.total))}</span>
          </div>
        </div>
      </div>

      {/* Action Navigation */}
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Link
          to={`/account/orders/${order.id}`}
          className="rounded-xl bg-black px-6 py-3 text-xs font-bold text-white hover:bg-gray-800 transition"
        >
          Track & View Order Details
        </Link>
        <Link
          to="/shop"
          className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-xs font-bold text-gray-950 hover:border-black transition"
        >
          Continue Shopping
        </Link>
      </div>
    </main>
  );
}

export default OrderSuccessPage;
