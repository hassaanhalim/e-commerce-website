import { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import { orderApi } from "../../services/order-api";
import type { BackendOrder, OrderStatus, PaymentStatus } from "../../types/order";
import { formatPrice } from "../../utils/formatPrice";
import AdminStatusBadge from "../../components/admin/AdminStatusBadge";
import { CheckCircleIcon, AlertIcon, PhoneIcon } from "../../components/common/Icons";

export function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();

  const [order, setOrder] = useState<BackendOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [updating, setUpdating] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const fetchOrder = () => {
    if (!orderId) return;
    setLoading(true);
    orderApi
      .getAdminOrderById(orderId)
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

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-black border-t-transparent" />
        <p className="mt-3 text-xs font-semibold text-gray-400">Loading admin order details...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center space-y-3">
        <p className="text-base font-bold text-gray-900">Order Not Found</p>
        <p className="text-xs text-gray-500">{error || "The requested order could not be retrieved."}</p>
        <Link to="/admin/orders" className="inline-block mt-4 rounded-xl bg-black px-5 py-2.5 text-xs font-bold text-white">
          Return to Orders
        </Link>
      </div>
    );
  }

  const handleStatusChange = async (newStatus: OrderStatus) => {
    setUpdating(true);
    setError("");
    setSuccessMessage("");
    try {
      const updated = await orderApi.updateOrderStatusByAdmin(order.id, newStatus, statusNote);
      setOrder(updated);
      setStatusNote("");
      setSuccessMessage(`Order status updated to "${newStatus}".`);
    } catch (err: unknown) {
      const msg = typeof err === "object" && err !== null && "message" in err
        ? (err as { message: string }).message
        : "Failed to update order status.";
      setError(msg);
    } finally {
      setUpdating(false);
    }
  };

  const handlePaymentStatusChange = async (newPaymentStatus: PaymentStatus) => {
    setUpdating(true);
    setError("");
    setSuccessMessage("");
    try {
      const updated = await orderApi.updatePaymentStatusByAdmin(order.id, newPaymentStatus);
      setOrder(updated);
      setSuccessMessage(`Payment status updated to "${newPaymentStatus}".`);
    } catch (err: unknown) {
      const msg = typeof err === "object" && err !== null && "message" in err
        ? (err as { message: string }).message
        : "Failed to update payment status.";
      setError(msg);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Title Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/orders"
            className="rounded-xl border border-gray-300 bg-white p-2 text-gray-500 hover:border-black hover:text-black transition"
          >
            ←
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold text-gray-950 font-mono">{order.orderNumber}</h1>
              <AdminStatusBadge status={order.status} />
            </div>
            <p className="mt-1 text-xs font-semibold text-gray-500">
              Placed on {new Date(order.createdAt).toLocaleString("en-PK")}
            </p>
          </div>
        </div>

        {/* Quick Status Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-gray-700">Update Status:</label>
          <select
            value={order.status}
            onChange={(e) => handleStatusChange(e.target.value as OrderStatus)}
            disabled={updating || order.status === "DELIVERED" || order.status === "CANCELLED"}
            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-black cursor-pointer disabled:opacity-50"
          >
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PROCESSING">Processing</option>
            <option value="SHIPPED">Shipped</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {successMessage && (
        <div className="flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-semibold text-emerald-800">
          <CheckCircleIcon className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1.5 rounded-xl bg-red-50 border border-red-200 p-4 text-xs font-semibold text-red-700">
          <AlertIcon className="h-4 w-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Items & Timeline */}
        <div className="md:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ordered Items</h3>
            <div className="divide-y divide-gray-150">
              {order.items.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between text-xs">
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
              ))}
            </div>
          </div>

          {/* Status Timeline */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Audit Status History</h3>
            <div className="space-y-3">
              {order.statusHistory?.map((h) => (
                <div key={h.id} className="flex items-start gap-3 text-xs">
                  <div className="mt-1 h-3 w-3 rounded-full bg-black shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-950">{h.toStatus}</span>
                      <span className="text-gray-400 text-[11px]">{new Date(h.createdAt).toLocaleString("en-PK")}</span>
                    </div>
                    {h.note && <p className="text-gray-600 font-medium mt-0.5">{h.note}</p>}
                    {h.changedBy && <p className="text-gray-400 text-[10px]">Changed by: {h.changedBy.fullName}</p>}
                  </div>
                </div>
              ))}
            </div>

            {/* Note input for status change */}
            <div className="border-t border-gray-150 pt-4 space-y-2">
              <label className="text-[11px] font-bold text-gray-500 uppercase">Add Optional Note to Next Status Change</label>
              <input
                type="text"
                placeholder="Internal audit note or tracking number..."
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                className="w-full rounded-xl border border-gray-300 p-2.5 text-xs outline-none focus:border-black"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Customer & Payment Details */}
        <div className="space-y-6">
          {/* Customer Info */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-2 text-xs">
            <h3 className="font-bold text-gray-400 uppercase tracking-wider">Customer Info</h3>
            <p className="font-bold text-gray-950 text-sm">{order.user?.fullName || order.shippingAddressSnapshot.recipientName}</p>
            <p className="text-gray-600">Email: {order.customerEmail}</p>
            <p className="text-gray-600">Phone: {order.customerPhone}</p>
          </div>

          {/* Payment Status Control */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-3 text-xs">
            <h3 className="font-bold text-gray-400 uppercase tracking-wider">Payment Details</h3>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Method:</span>
              <span className="font-bold text-gray-950">{order.paymentMethod === "CASH_ON_DELIVERY" ? "COD" : "Mock Online"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Status:</span>
              <span className={`font-bold rounded px-2 py-0.5 text-[10px] ${
                order.paymentStatus === "PAID" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
              }`}>
                {order.paymentStatus}
              </span>
            </div>

            <div className="border-t border-gray-150 pt-3 space-y-2">
              <label className="text-[11px] font-bold text-gray-500 uppercase">Change Payment Status</label>
              <select
                value={order.paymentStatus}
                onChange={(e) => handlePaymentStatusChange(e.target.value as PaymentStatus)}
                disabled={updating}
                className="w-full rounded-xl border border-gray-300 p-2 text-xs font-semibold outline-none focus:border-black cursor-pointer"
              >
                <option value="PENDING">PENDING</option>
                <option value="PAID">PAID</option>
                <option value="FAILED">FAILED</option>
                <option value="REFUNDED">REFUNDED</option>
              </select>
            </div>
          </div>

          {/* Address Snapshot */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-2 text-xs">
            <h3 className="font-bold text-gray-400 uppercase tracking-wider">Shipping Address</h3>
            <p className="font-bold text-gray-950 text-sm">{order.shippingAddressSnapshot.recipientName}</p>
            <p className="text-gray-600">{order.shippingAddressSnapshot.addressLine1}</p>
            <p className="text-gray-500">{order.shippingAddressSnapshot.city}, {order.shippingAddressSnapshot.country}</p>
            <p className="text-gray-400 flex items-center gap-1.5">
              <PhoneIcon className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              <span>{order.shippingAddressSnapshot.phone}</span>
            </p>
          </div>

          {/* Financial Breakdown */}
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 shadow-xs space-y-2 text-xs font-semibold text-gray-600">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatPrice(Number(order.subtotal))}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping Fee</span>
              <span>{formatPrice(Number(order.shippingAmount))}</span>
            </div>
            <div className="border-t border-gray-200 pt-3 flex justify-between text-sm font-extrabold text-gray-950">
              <span>Total</span>
              <span className="text-base">{formatPrice(Number(order.total))}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrderDetailPage;
